// 휴대폰 · PC 알림 보내기 (웹 푸시). DB 트리거(private.push)가 push_outbox에 쌓고 pg_net으로 여기를 깨워요.
//   POST /functions/v1/push-send   헤더 x-push-secret (vault push_hook과 같은 값 = 비밀 값 PUSH_HOOK_SECRET)
// 웹 푸시 암호화(RFC 8291 aes128gcm) · VAPID 서명(RFC 8292)을 WebCrypto로 직접 해요 — 바깥 라이브러리 없이.
// 키: DB vault(push_vapid_pub · push_vapid_priv · push_hook)를 서비스 키 전용 RPC push_keys()로 읽어요 — 대시보드에 따로 넣을 필요 없어요.
//   (Edge Function 비밀 값 VAPID_PUBLIC_KEY · VAPID_PRIVATE_KEY · PUSH_HOOK_SECRET이 있으면 그걸 먼저 써요. VAPID_SUBJECT는 선택, mailto:)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const env = (k: string) => Deno.env.get(k) || "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const enc = new TextEncoder();
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const ub64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8));
}
// 보낼 내용 암호화 (받는 기기 키 p256dh · auth)
export async function encrypt(payload: string, p256dh: string, auth: string) {
  const ua = ub64(p256dh), secret = ub64(auth), salt = crypto.getRandomValues(new Uint8Array(16));
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(secret, shared, cat(enc.encode("WebPush: info\0"), ua, asPub), 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, cat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 레코드 크기 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
// VAPID: 알림 서버(구글 · 애플 · 모질라)에 "우리 서버가 보낸 것"이라고 서명
let signKey: CryptoKey | null = null;
export async function vapidAuth(endpoint: string, pub: string, d: string, subject: string) {
  if (!signKey) {
    const p = ub64(pub);
    signKey = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", d, x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), ext: false }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  }
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signKey, enc.encode(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${pub}`;
}

Deno.serve(async req => {
  if (req.method !== "POST") return reply({ error: "post_only" }, 405);
  const { data: k } = await admin.rpc("push_keys");
  const hook = env("PUSH_HOOK_SECRET") || k?.hook || "";
  if (!hook || req.headers.get("x-push-secret") !== hook) return reply({ error: "bad_secret" }, 401);
  const pub = env("VAPID_PUBLIC_KEY") || k?.pub || "", d = env("VAPID_PRIVATE_KEY") || k?.priv || "", subject = env("VAPID_SUBJECT") || "mailto:help@academysupportcenter.app";
  if (!pub || !d) return reply({ error: "no_vapid" }, 500);

  const { data: jobs } = await admin.from("push_outbox").select("id, user_id, kind, title, body, url, tag").is("sent_at", null).order("id").limit(300);
  if (!jobs || !jobs.length) return reply({ ok: true, sent: 0 });
  // 먼저 "보내는 중"으로 표시해서 동시에 깨어난 다른 요청과 두 번 보내지 않게
  const ids = jobs.map(j => j.id);
  const { data: mine } = await admin.from("push_outbox").update({ sent_at: new Date().toISOString(), result: "sending" }).in("id", ids).is("sent_at", null).select("id");
  const take = new Set((mine || []).map(m => m.id));
  const list = jobs.filter(j => take.has(j.id));
  const users = [...new Set(list.map(j => j.user_id))];
  const { data: subs } = await admin.from("push_subs").select("id, user_id, endpoint, p256dh, auth, kinds, fails").in("user_id", users.length ? users : ["00000000-0000-0000-0000-000000000000"]);
  let sent = 0, gone = 0;
  for (const j of list) {
    const mineSubs = (subs || []).filter(s => s.user_id === j.user_id && s.kinds.includes(j.kind));
    const res: string[] = [];
    for (const s of mineSubs) {
      try {
        const body = await encrypt(JSON.stringify({ title: j.title, body: j.body, url: j.url, tag: j.tag }), s.p256dh, s.auth);
        const r = await fetch(s.endpoint, { method: "POST", body, headers: {
          Authorization: await vapidAuth(s.endpoint, pub, d, subject), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: j.kind === "chat" || j.kind === "attend" ? "high" : "normal",
          ...(j.tag ? { Topic: j.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) } : {}) } });
        await r.body?.cancel();
        if (r.status === 404 || r.status === 410) { await admin.from("push_subs").delete().eq("id", s.id); gone++; res.push("gone"); }
        else if (r.ok) { sent++; res.push("ok"); await admin.from("push_subs").update({ last_ok_at: new Date().toISOString(), fails: 0 }).eq("id", s.id); }
        else { res.push(String(r.status)); await admin.from("push_subs").update({ fails: s.fails + 1 }).eq("id", s.id); }
      } catch (e) { res.push("err:" + String((e as Error).message || e).slice(0, 40)); }
    }
    await admin.from("push_outbox").update({ result: res.join(",") || "no_device" }).eq("id", j.id);
  }
  // 오래된 기록 정리 (7일)
  await admin.from("push_outbox").delete().lt("created_at", new Date(Date.now() - 7 * 864e5).toISOString());
  return reply({ ok: true, jobs: list.length, sent, gone });
});

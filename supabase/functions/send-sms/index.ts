// 단체 문자 보내기: 상담 · 원생 · 학부모 연락처를 골라 한 번에 (원장, 또는 "공지" 권한이 있는 강사)
//   POST { academy_id, to: [{ phone, name }], text, ad, target }
// 문구의 {이름}은 받는 사람마다 이름으로 바꿔요. 학원마다 한 달 500건(sms_left), 센터 관리자는 제한 없음.
// 홍보 문자(ad)는 "(광고)" + 학원 이름을 앞에, 무료 수신거부 번호(SOLAPI_OPTOUT)를 뒤에 붙이고, 밤 9시 ~ 아침 8시에는 보내지 않아요.
// 보내는 곳은 솔라피(SOLAPI_API_KEY · SOLAPI_API_SECRET · SOLAPI_SENDER) — 키는 Supabase 비밀 값으로, 없으면 not_ready.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const env = (k: string) => Deno.env.get(k) || "";
// 솔라피 키는 대시보드에 붙여 넣을 때 공백 · 줄바꿈 · 보이지 않는 글자가 섞이기 쉬워서, 영문 · 숫자 · 기호만 남겨요 (헤더에 다른 글자가 있으면 보내기가 통째로 실패해요)
const sol = (k: string) => env(k).replace(/[^\x21-\x7E]/g, "");
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const digits = (s: unknown) => String(s || "").replace(/\D/g, "");

async function hmac(key: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map(x => x.toString(16).padStart(2, "0")).join("");
}

// 솔라피로 보내기: IP가 고정인 데이터베이스 서버가 대신 보내요(public.solapi_relay). 함수는 서명만 만들어 넘기고 결과를 기다려요.
async function solapi(path: string, payload: unknown) {
  const date = new Date().toISOString(), salt = crypto.randomUUID().replace(/-/g, "");
  const sig = await hmac(sol("SOLAPI_API_SECRET"), date + salt);
  const auth = `HMAC-SHA256 apiKey=${sol("SOLAPI_API_KEY")}, date=${date}, salt=${salt}, signature=${sig}`;
  const { data: id, error } = await admin.rpc("solapi_relay", { p_path: path, p_auth: auth, p_body: payload });
  if (error || !id) throw new Error("relay " + (error ? error.message : "no_id"));
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 400));
    const { data: res } = await admin.rpc("solapi_result", { p_id: id });
    if (res) {
      // deno-lint-ignore no-explicit-any
      let body: any = null; try { body = JSON.parse(res.body || "null"); } catch { body = res.body; }
      return { ok: res.status >= 200 && res.status < 300, status: res.status || 0, body, error: res.error };
    }
  }
  throw new Error("relay_timeout");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "post_only" }, 405);
  const ready = !!(env("SOLAPI_API_KEY") && sol("SOLAPI_API_SECRET") && env("SOLAPI_SENDER"));
  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return reply({ error: "bad_json" }, 400); }
  // 키가 맞는 모양인지(길이만 · 값은 돌려주지 않아요): 솔라피 API Key(v3)는 22자, Secret은 32자
  if (body && body.check) return reply({ ready, optout: !!env("SOLAPI_OPTOUT"),
    shape: { key: sol("SOLAPI_API_KEY").length, key_raw: env("SOLAPI_API_KEY").length, secret: sol("SOLAPI_API_SECRET").length, secret_raw: env("SOLAPI_API_SECRET").length, sender: digits(env("SOLAPI_SENDER")).length } });

  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await sb.auth.getUser();
  if (!u || !u.user) return reply({ error: "login" }, 401);
  const A = String(body.academy_id || "");
  const { data: mem } = await admin.from("academy_members").select("role, perms").eq("academy_id", A).eq("user_id", u.user.id).maybeSingle();
  const { data: isAdmin } = await sb.rpc("am_center_admin");
  if (!isAdmin && !(mem && (mem.role === "owner" || (mem.role === "teacher" && (mem.perms || []).includes("notices"))))) return reply({ error: "not_allowed" }, 403);
  if (!ready) return reply({ error: "not_ready" });

  const ad = !!body.ad;
  const hour = new Date(Date.now() + 9 * 3600e3).getUTCHours();
  if (ad && (hour >= 21 || hour < 8)) return reply({ error: "night" });
  let text = String(body.text || "").trim();
  if (!text || text.length > 1500) return reply({ error: "bad_text" });
  const { data: acad } = await admin.from("academies").select("name").eq("id", A).maybeSingle();
  if (ad) {
    if (!text.startsWith("(광고)")) text = `(광고)[${acad ? acad.name : ""}]\n${text}`;
    if (env("SOLAPI_OPTOUT") && !text.includes(digits(env("SOLAPI_OPTOUT")).slice(-4))) text += `\n무료거부 ${env("SOLAPI_OPTOUT")}`;
  }
  // 받는 사람: 휴대폰만, 같은 번호는 한 번
  const seen = new Set<string>();
  const to = (Array.isArray(body.to) ? body.to : []).map((x: { phone?: string; name?: string }) => ({ phone: digits(x.phone), name: String(x.name || "").slice(0, 30) }))
    .filter((x: { phone: string }) => /^01\d{8,9}$/.test(x.phone) && !seen.has(x.phone) && seen.add(x.phone)).slice(0, 1000);
  if (!to.length) return reply({ error: "no_phone" });
  const { data: left } = await sb.rpc("sms_left", { p_academy: A });
  if (left !== null && left !== undefined && to.length > Number(left)) return reply({ error: "limit", left });

  const from = digits(env("SOLAPI_SENDER"));
  // deno-lint-ignore no-explicit-any
  let res: any = null;
  try {
    const r = await solapi("/messages/v4/send-many/detail", { messages: to.map((x: { phone: string; name: string }) => ({ to: x.phone, from, text: text.replaceAll("{이름}", x.name || "") })) });
    if (!r.ok) { console.error("solapi", r.status, r.body || r.error); return reply({ error: "send_failed" }); }
    res = r.body;
  } catch (e) { console.error(e); return reply({ error: "send_failed" }); }
  const failed = Array.isArray(res?.failedMessageList) ? res.failedMessageList.length : 0;
  const { data: p } = await admin.from("profiles").select("name, username").eq("id", u.user.id).maybeSingle();
  await admin.from("sms_logs").insert({ academy_id: A, by_id: u.user.id, by_name: p ? p.name || p.username : null, ad, body: text.slice(0, 2000),
    total: to.length, sent: to.length - failed, failed, target: String(body.target || "").slice(0, 100) || null });
  return reply({ ok: true, sent: to.length - failed, failed });
});

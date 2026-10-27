// 아이디 · 비밀번호 찾기 (로그인 전이라 JWT 확인 없이 받아요 — verify_jwt false)
//  find_id   { name, contact }                       이름 + 휴대폰/이메일이 맞으면 가린 아이디(ab***e)와 가입한 날
//  send_code { username, contact }                    아이디 + 가입한 휴대폰/이메일이 맞으면 6자리 인증번호를 보내요
//  reset     { username, contact, code, password }    인증번호가 맞으면 새 비밀번호로 바꿔요
//  admin_temp { user_id }                             센터 관리자만: 아이디 회원에게 임시 비밀번호를 만들어 줘요
// 인증번호는 해시만 recovery_codes에 남기고, 10분 안에 5번까지 맞혀 볼 수 있어요. 한 사람에게 1시간에 5번까지 보내요.
// 보내는 곳: 이메일은 Resend(RESEND_API_KEY · MAIL_FROM), 문자는 솔라피(SOLAPI_API_KEY · SOLAPI_API_SECRET · SOLAPI_SENDER).
// 키는 코드에 쓰지 않고 Supabase Edge Function 비밀 값으로 받아요. 없으면 not_ready로 알려 주고 화면이 다른 방법을 안내해요.
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
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

const digits = (s: string) => String(s || "").replace(/\D/g, "");
const normName = (s: string) => String(s || "").replace(/\s+/g, "").toLowerCase();
// 휴대폰인지 이메일인지
function parseContact(raw: string): { kind: "phone" | "email"; value: string } | null {
  const s = String(raw || "").trim().toLowerCase();
  if (s.includes("@")) return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? { kind: "email", value: s } : null;
  const d = digits(s);
  return /^0\d{8,10}$/.test(d) ? { kind: "phone", value: d } : null;
}
const maskId = (u: string) => u.length <= 3 ? u[0] + "*".repeat(u.length - 1) : u.slice(0, 2) + "*".repeat(u.length - 3) + u.slice(-1);
const maskMail = (m: string) => { const [a, b] = m.split("@"); return `${a.slice(0, 2)}${"*".repeat(Math.max(1, a.length - 2))}@${b}`; };
const maskPhone = (p: string) => `${p.slice(0, 3)}-****-${p.slice(-4)}`;
const ready = { email: !!(env("RESEND_API_KEY") && env("MAIL_FROM")), phone: !!(env("SOLAPI_API_KEY") && env("SOLAPI_API_SECRET") && env("SOLAPI_SENDER")) };

async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function hmac(key: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function sendEmail(to: string, subject: string, text: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("MAIL_FROM"), to: [to], subject, text }),
  });
  if (!r.ok) throw new Error("mail_failed " + r.status);
}
async function sendSms(to: string, text: string) {
  const date = new Date().toISOString(), salt = crypto.randomUUID().replace(/-/g, "");
  const sig = await hmac(env("SOLAPI_API_SECRET"), date + salt);
  const r = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: { Authorization: `HMAC-SHA256 apiKey=${env("SOLAPI_API_KEY")}, date=${date}, salt=${salt}, signature=${sig}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { to, from: digits(env("SOLAPI_SENDER")), text } }),
  });
  if (!r.ok) throw new Error("sms_failed " + r.status);
}

// 아이디로 회원 찾기 (아이디 회원만 — 구글 회원은 비밀번호가 없어요)
async function byUsername(username: string) {
  const { data } = await admin.from("profiles").select("id, username, phone, email").eq("username", String(username || "").trim().toLowerCase()).limit(1);
  return data && data[0];
}
const matches = (p: { phone?: string; email?: string }, c: { kind: string; value: string }) =>
  c.kind === "phone" ? p.phone === c.value : (p.email || "").toLowerCase() === c.value;

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { return reply({ error: "bad_request" }, 400); }
  const act = body.action;

  if (act === "find_id") {
    const c = parseContact(body.contact);
    if (!c || !normName(body.name)) return reply({ error: "bad_input" }, 400);
    const q = admin.from("profiles").select("id, username, name, email, created_at").limit(20);
    const { data } = await (c.kind === "phone" ? q.eq("phone", c.value) : q.eq("email", c.value));
    const list = (data || []).filter(p => normName(p.name) === normName(body.name)).map(p => ({
      id: p.username ? maskId(p.username) : null,
      google: p.username ? null : (p.email ? maskMail(p.email) : "구글 계정"),
      joined: String(p.created_at || "").slice(0, 10),
    }));
    return reply({ list });
  }

  if (act === "send_code") {
    const c = parseContact(body.contact);
    if (!c || !body.username) return reply({ error: "bad_input" }, 400);
    const p = await byUsername(body.username);
    if (!p || !matches(p, c)) return reply({ error: "not_found" });
    if (!ready[c.kind]) return reply({ error: "not_ready", other: c.kind === "phone" ? (ready.email && !!p.email) : (ready.phone && !!p.phone) });
    const since = new Date(Date.now() - 3600e3).toISOString();
    const { count } = await admin.from("recovery_codes").select("id", { count: "exact", head: true }).eq("user_id", p.id).gte("created_at", since);
    if ((count || 0) >= 5) return reply({ error: "too_many" });
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, "0");
    const text = `[학원지원센터] 비밀번호 찾기 인증번호 ${code} (10분 안에 넣어 주세요)`;
    try {
      if (c.kind === "email") await sendEmail(c.value, "[학원지원센터] 비밀번호 찾기 인증번호", `${text}\n\n본인이 요청하지 않았다면 이 메일은 무시해 주세요.`);
      else await sendSms(c.value, text);
    } catch (e) { console.error(e); return reply({ error: "send_failed" }); }
    await admin.from("recovery_codes").insert({ user_id: p.id, channel: c.kind, target: c.value, code_hash: await sha(p.id + ":" + code) });
    return reply({ ok: true, to: c.kind === "phone" ? maskPhone(c.value) : maskMail(c.value) });
  }

  if (act === "reset") {
    const c = parseContact(body.contact), pw = String(body.password || "");
    if (!c || !body.username || !/^\d{6}$/.test(String(body.code || ""))) return reply({ error: "bad_input" }, 400);
    if (pw.length < 8 || pw.length > 72) return reply({ error: "weak_password" });
    const p = await byUsername(body.username);
    if (!p || !matches(p, c)) return reply({ error: "not_found" });
    const { data: rows } = await admin.from("recovery_codes").select("*").eq("user_id", p.id).eq("target", c.value)
      .is("used_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1);
    const r = rows && rows[0];
    if (!r || r.tries >= 5) return reply({ error: "expired" });
    if (r.code_hash !== await sha(p.id + ":" + body.code)) {
      await admin.from("recovery_codes").update({ tries: r.tries + 1 }).eq("id", r.id);
      return reply({ error: "bad_code", left: 4 - r.tries });
    }
    const { error } = await admin.auth.admin.updateUserById(p.id, { password: pw });
    if (error) { console.error(error); return reply({ error: "update_failed" }); }
    await admin.from("recovery_codes").update({ used_at: new Date().toISOString() }).eq("user_id", p.id).is("used_at", null);
    return reply({ ok: true });
  }

  if (act === "admin_temp") {
    const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
    const { data: isAdmin } = await sb.rpc("am_center_admin");
    if (isAdmin !== true) return reply({ error: "not_allowed" }, 403);
    const { data: p } = await admin.from("profiles").select("id, username").eq("id", body.user_id).maybeSingle();
    if (!p || !p.username) return reply({ error: "no_password_login" });
    const abc = "abcdefghjkmnpqrstuvwxyz23456789";
    const temp = [...crypto.getRandomValues(new Uint8Array(10))].map(x => abc[x % abc.length]).join("");
    const { error } = await admin.auth.admin.updateUserById(p.id, { password: temp });
    if (error) { console.error(error); return reply({ error: "update_failed" }); }
    return reply({ ok: true, password: temp, username: p.username });
  }

  return reply({ error: "bad_request" }, 400);
});

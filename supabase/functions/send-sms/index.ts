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
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const digits = (s: unknown) => String(s || "").replace(/\D/g, "");

async function hmac(key: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map(x => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "post_only" }, 405);
  const ready = !!(env("SOLAPI_API_KEY") && env("SOLAPI_API_SECRET") && env("SOLAPI_SENDER"));
  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return reply({ error: "bad_json" }, 400); }
  if (body && body.check) return reply({ ready, optout: !!env("SOLAPI_OPTOUT") });

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

  const date = new Date().toISOString(), salt = crypto.randomUUID().replace(/-/g, "");
  const sig = await hmac(env("SOLAPI_API_SECRET"), date + salt);
  const from = digits(env("SOLAPI_SENDER"));
  const r = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
    method: "POST",
    headers: { Authorization: `HMAC-SHA256 apiKey=${env("SOLAPI_API_KEY")}, date=${date}, salt=${salt}, signature=${sig}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages: to.map((x: { phone: string; name: string }) => ({ to: x.phone, from, text: text.replaceAll("{이름}", x.name || "") })) }),
  });
  // deno-lint-ignore no-explicit-any
  let res: any = null; try { res = await r.json(); } catch { /* 아래에서 실패로 */ }
  if (!r.ok) { console.error("solapi", r.status, res); return reply({ error: "send_failed" }); }
  const failed = Array.isArray(res?.failedMessageList) ? res.failedMessageList.length : 0;
  const { data: p } = await admin.from("profiles").select("name, username").eq("id", u.user.id).maybeSingle();
  await admin.from("sms_logs").insert({ academy_id: A, by_id: u.user.id, by_name: p ? p.name || p.username : null, ad, body: text.slice(0, 2000),
    total: to.length, sent: to.length - failed, failed, target: String(body.target || "").slice(0, 100) || null });
  return reply({ ok: true, sent: to.length - failed, failed });
});

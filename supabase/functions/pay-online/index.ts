// 학부모 온라인 카드 결제 (토스페이먼츠 결제창). 학원마다 academies.online_pay = off · test · live.
//   POST /functions/v1/pay-online  (로그인한 사람의 Authorization 그대로)
//   { action: "prepare", invoice }                   → 주문 번호 · 금액 (pay_orders에 ready)
//   { action: "confirm", paymentKey, orderId, amount } → 토스에 승인 요청 → done (실제 결제면 청구를 납부 확인)
//   { action: "fail", orderId, message }               → fail
// 키: 비밀 값 TOSS_TEST_SECRET_KEY, 없으면 DB vault toss_test_secret(서비스 키 전용 RPC pay_keys) — 테스트 키라 실제 돈이 나가지 않아요. 실제 결제(live)는 학원마다 결제 회사와 계약한 뒤 그 학원 키로 이어요 — 아직 막아 둠.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const env = (k: string) => Deno.env.get(k) || "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "post_only" }, 405);
  const authz = req.headers.get("authorization") || "";
  const user = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: authz } }, auth: { persistSession: false } });
  const { data: u } = await user.auth.getUser();
  if (!u || !u.user) return reply({ error: "not_signed_in" }, 401);
  const me = u.user.id;
  // deno-lint-ignore no-explicit-any
  let b: any; try { b = await req.json(); } catch { return reply({ error: "bad_json" }, 400); }

  if (b.action === "prepare") {
    // 볼 수 있는 청구인지: 학부모는 my_child_invoices, 원장 · 수납 권한은 invoices 그대로 (RLS)
    const { data: kid } = await user.rpc("my_child_invoices");
    // deno-lint-ignore no-explicit-any
    let ok = (kid || []).some((i: any) => i.id === b.invoice);
    if (!ok) { const { data: st } = await user.from("invoices").select("id").eq("id", b.invoice).maybeSingle(); ok = !!st; }
    if (!ok) return reply({ error: "no_invoice" }, 404);
    const { data: inv } = await admin.from("invoices").select("id, academy_id, student_name, month, title, amount, paid_at").eq("id", b.invoice).maybeSingle();
    if (!inv) return reply({ error: "no_invoice" }, 404);
    if (inv.paid_at) return reply({ error: "already_paid" }, 409);
    const { data: ac } = await admin.from("academies").select("name, online_pay").eq("id", inv.academy_id).maybeSingle();
    if (!ac || ac.online_pay === "off") return reply({ error: "pay_off" }, 403);
    if (ac.online_pay === "live") return reply({ error: "live_not_ready" }, 403);
    const { data: p } = await admin.from("profiles").select("name, username").eq("id", me).maybeSingle();
    const id = "asc_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const title = `${ac.name} ${inv.student_name || ""} ${inv.title || "수강료"}`.replace(/\s+/g, " ").trim().slice(0, 90);
    const { error } = await admin.from("pay_orders").insert({ id, academy_id: inv.academy_id, invoice_id: inv.id, user_id: me, payer_name: p?.name || p?.username || null, title, amount: inv.amount, test: true });
    if (error) return reply({ error: error.message }, 400);
    return reply({ orderId: id, amount: inv.amount, orderName: title, customerName: p?.name || null, test: true });
  }

  const { data: o } = await admin.from("pay_orders").select("*").eq("id", String(b.orderId || "")).maybeSingle();
  if (!o || o.user_id !== me) return reply({ error: "no_order" }, 404);

  if (b.action === "fail") {
    if (o.status === "ready") await admin.from("pay_orders").update({ status: "fail", fail_msg: String(b.message || "").slice(0, 200) }).eq("id", o.id);
    return reply({ ok: true });
  }
  if (b.action !== "confirm") return reply({ error: "bad_action" }, 400);
  if (o.status === "done") return reply({ ok: true, already: true, test: o.test });
  if (Number(b.amount) !== o.amount) return reply({ error: "amount_mismatch" }, 400); // 금액을 바꿔 치는 것을 막아요
  const { data: pk } = await admin.rpc("pay_keys");
  const secret = o.test ? env("TOSS_TEST_SECRET_KEY") || pk?.test || "" : "";
  if (!secret) return reply({ error: "no_key" }, 500);
  const r = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(secret + ":"), "Content-Type": "application/json", "Idempotency-Key": o.id },
    body: JSON.stringify({ paymentKey: b.paymentKey, orderId: o.id, amount: o.amount }),
  });
  const t = await r.json().catch(() => ({}));
  if (!r.ok || t.status !== "DONE") {
    await admin.from("pay_orders").update({ status: "fail", fail_msg: String(t.message || r.status).slice(0, 200) }).eq("id", o.id);
    return reply({ error: "toss_fail", message: t.message || null, code: t.code || null }, 400);
  }
  const method = [t.method, t.easyPay?.provider].filter(Boolean).join(" · ").slice(0, 40) || "카드";
  await admin.from("pay_orders").update({ status: "done", payment_key: String(b.paymentKey).slice(0, 200), method, approved_at: new Date().toISOString() }).eq("id", o.id);
  // 실제 결제만 청구를 납부 확인 (테스트는 기록만)
  if (!o.test && o.invoice_id) await admin.from("invoices").update({ paid_at: kstDay(), method: "카드(온라인)", pay_ref: String(b.paymentKey).slice(0, 80) }).eq("id", o.invoice_id).is("paid_at", null);
  await admin.rpc("pay_order_notify", { p_order: o.id });
  return reply({ ok: true, test: o.test, method, amount: o.amount });
});

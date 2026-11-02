// 바깥에서 들어오는 기록 받기: 카드 결제(단말기 · 키오스크 · 온라인 결제) · 통장 거래 · 전문 앱 기록
// 학원 원장님이 "결제 · 통장 · 앱 연결" 화면에서 만든 연결 키로 받아요 (로그인 없이 — verify_jwt false).
//   POST /functions/v1/ext-feed   헤더 x-asc-key: asc_card_…   (또는 Authorization: Bearer asc_…)
//   카드  { items: [{ amount, at, ref, payer, card, method, memo, cancel? }] }
//   통장  { items: [{ kind: "in"|"out", amount, at, ref, payer, memo }] }
//   전문 앱 { records: [{ student_id | user_id | student_name(+phone), kind, title, subject, score, max_score, level, minutes, detail, at, ext_id, app }] }
// 연결 회사마다 보내는 모양이 다르면, 계약할 때 여기에 그 회사 모양을 위 모양으로 바꾸는 부분만 더하면 돼요(adapt).
// 카드 · 통장 입금은 들어오자마자 DB 트리거(private.pay_feed_match)가 금액 · 이름이 맞는 미납 청구를 찾아 납부 확인해요.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-asc-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const env = (k: string) => Deno.env.get(k) || "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
const str = (v: unknown, n: number) => (v == null || v === "" ? null : String(v).trim().slice(0, n) || null);
const money = (v: unknown) => Math.round(Math.abs(Number(String(v ?? "").replace(/[^0-9.-]/g, "")) || 0));
const when = (v: unknown) => { const d = v ? new Date(String(v)) : new Date(); return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(); };
const digits = (s: unknown) => String(s || "").replace(/\D/g, "");

// 연결 회사마다 다른 모양을 위의 기본 모양으로 (계약하면 여기에 더해요)
// deno-lint-ignore no-explicit-any
function adapt(body: any): any[] {
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.records)) return body.records;
  if (Array.isArray(body)) return body;
  return body && typeof body === "object" ? [body] : [];
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "post_only" }, 405);
  const key = req.headers.get("x-asc-key") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!/^asc_(card|bank|app)_[0-9a-f]{48}$/.test(key)) return reply({ error: "bad_key" }, 401);
  const { data: link } = await admin.from("ext_links").select("id, academy_id, kind, provider, account_id, status").eq("key_hash", await sha(key)).maybeSingle();
  if (!link) return reply({ error: "bad_key" }, 401);

  let body: unknown;
  try { body = await req.json(); } catch { return reply({ error: "bad_json" }, 400); }
  const items = adapt(body).slice(0, 500);
  if (!items.length) return reply({ error: "empty" }, 400);
  const A = link.academy_id, out = { ok: true, added: 0, matched: 0, skipped: 0, canceled: 0, errors: [] as string[] };

  if (link.kind === "card" || link.kind === "bank") {
    for (const it of items) {
      const ref = str(it.ref ?? it.approval_no ?? it.tid ?? it.id, 80);
      // 결제 취소: 그 결제로 넣은 납부 확인도 풀어요
      if (link.kind === "card" && (it.cancel === true || /취소|cancel/i.test(String(it.status || "")))) {
        if (!ref) { out.skipped++; continue; }
        const { data: f } = await admin.from("pay_feed").select("id, invoice_id").eq("academy_id", A).eq("source", "card").eq("ref", ref).maybeSingle();
        if (f && f.invoice_id) {
          const { data: inv } = await admin.from("invoices").select("memo, pay_ref").eq("id", f.invoice_id).maybeSingle();
          if (inv && inv.pay_ref === ref) await admin.from("invoices").update({ paid_at: null, method: null, pay_ref: null, memo: [inv.memo, "결제 취소됨"].filter(Boolean).join(" · ").slice(0, 300) }).eq("id", f.invoice_id);
        }
        if (f) { await admin.from("pay_feed").update({ status: "cancel" }).eq("id", f.id); out.canceled++; } else out.skipped++;
        continue;
      }
      const amount = money(it.amount ?? it.price ?? it.total);
      if (!amount) { out.skipped++; continue; }
      const row = {
        academy_id: A, source: link.kind, provider: str(it.provider, 40) || link.provider,
        kind: link.kind === "bank" && (it.kind === "out" || Number(it.amount) < 0) ? "out" : "in",
        amount, happened_at: when(it.at ?? it.approved_at ?? it.date), ref,
        payer: str(it.payer ?? it.name ?? it.buyer, 80), method: str(it.method, 20) || (link.kind === "card" ? "카드" : "계좌이체"),
        card: str(it.card ?? it.issuer, 40), memo: str(it.memo ?? it.goods ?? it.description, 200), account_id: link.account_id, raw: it,
      };
      const { data, error } = await admin.from("pay_feed").insert(row).select("status").maybeSingle();
      if (error) { if (error.code === "23505") out.skipped++; else out.errors.push(error.message); continue; }
      out.added++; if (data && data.status === "done") out.matched++;
    }
  } else {
    // 전문 앱 기록 → 학생 찾기: 우리 학생 번호 · 앱 계정(같은 Supabase) · 이름(+연락처)
    const { data: studs } = await admin.from("students").select("id, name, phone, parent_phone").eq("academy_id", A);
    const list = studs || [];
    for (const it of items) {
      let sid = list.some(s => s.id === it.student_id) ? it.student_id : null;
      if (!sid && it.user_id) {
        const { data: ln } = await admin.from("student_links").select("student_id").eq("user_id", it.user_id);
        sid = (ln || []).map(x => x.student_id).find(x => list.some(s => s.id === x)) || null;
      }
      if (!sid && it.student_name) {
        const nm = String(it.student_name).replace(/\s/g, ""), ph = digits(it.phone);
        const c = list.filter(s => s.name.replace(/\s/g, "") === nm && (!ph || digits(s.phone) === ph || digits(s.parent_phone) === ph));
        if (c.length === 1) sid = c[0].id;
      }
      const title = str(it.title, 100);
      if (!sid || !title) { out.skipped++; continue; }
      const kinds = ["test", "quiz", "homework", "study", "attend", "memo", "etc"];
      const num = (v: unknown) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));
      const { error } = await admin.from("app_records").insert({
        academy_id: A, student_id: sid, app: str(it.app, 40) || "pro", kind: kinds.includes(it.kind) ? it.kind : "etc", title,
        subject: str(it.subject, 40), score: num(it.score), max_score: num(it.max_score) || null, level: str(it.level, 40),
        minutes: num(it.minutes) == null ? null : Math.max(0, Math.round(Number(it.minutes))), detail: it.detail ?? null,
        happened_at: when(it.at ?? it.happened_at), ext_id: str(it.ext_id ?? it.id, 80),
      });
      if (error) { if (error.code === "23505") out.skipped++; else out.errors.push(error.message); continue; }
      out.added++;
    }
  }
  await admin.from("ext_links").update({ last_at: new Date().toISOString(), ...(link.status !== "on" && out.added ? { status: "on", on_at: new Date().toISOString() } : {}) }).eq("id", link.id);
  if (!out.errors.length) delete (out as { errors?: string[] }).errors; else out.errors = out.errors.slice(0, 5);
  return reply(out);
});

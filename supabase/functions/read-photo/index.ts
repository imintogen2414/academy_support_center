// 사진으로 넣기 — "AI로 더 정확하게 읽기": 시간표 · 수강료표 · 원생 명단 · 영수증 · 장부 사진을 Claude가 읽어서 표(JSON)로 돌려줘요.
// (먼저 화면이 이 기기 안에서 무료로 읽고, 틀릴 때만 여기로 와요. 무료로 읽은 글자 ocr_text도 참고로 받아요.)
// 원장만 쓸 수 있고, 학원마다 한 달 10장까지예요(센터 관리자는 제한 없음 · start_photo_read). 읽기에 실패하면 장수를 되돌려요.
// 비용을 아끼려고 level auto는 빠르고 싼 Claude Haiku 5.5(effort low)로 먼저 읽고, 줄이 없거나 "확인 필요"가 30% 이상이면
// 같은 요청 안에서 Claude Sonnet 5.5로 다시 읽어요(한 장으로 셈). level precise는 바로 Sonnet 5.5. 어느 쪽까지 썼는지는 photo_reads.tier.
// 키는 코드에 쓰지 않고 Supabase 비밀 값 ANTHROPIC_API_KEY로 받아요.
// 돌려준 줄은 화면에서 원장님이 확인 · 고친 뒤에 저장해요(여기서는 저장하지 않아요).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const str = { type: "string" };
// kind마다 읽을 칸 · 설명
const KINDS: Record<string, { schema: Record<string, unknown>; prompt: string }> = {
  timetable: {
    schema: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: {
              class_name: str, weekday: { type: "integer" }, start_time: str, end_time: str,
              subject: str, room: str, teacher_name: str, unsure: { type: "boolean" },
            },
            required: ["class_name", "weekday", "start_time", "end_time", "subject", "room", "teacher_name", "unsure"],
            additionalProperties: false,
          },
        },
        note: str,
      },
      required: ["rows", "note"],
      additionalProperties: false,
    },
    prompt: `이 사진은 한국 학원의 수업 시간표예요. 수업 하나(반 · 요일 · 시간)를 한 줄로 모두 적어 주세요.
- weekday: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토. "월수금"처럼 여러 요일이면 요일마다 한 줄씩.
- start_time · end_time: 24시간 "HH:MM". 오전/오후 표시가 없고 1~9시면 학원 수업이라 오후(13~21시)로 보고 unsure를 true로.
- 끝나는 시간이 없으면 시작 + 50분으로 적고 unsure를 true로.
- class_name: 반 이름(예: 초등 B반, 중2 심화). 반 이름이 없으면 과목 + 학년으로.
- subject · room · teacher_name: 보이면 적고, 없으면 빈 문자열.
- 글씨가 흐리거나 짐작한 칸이 있으면 unsure를 true로.
- note: 못 읽은 부분이나 원장님이 확인할 점을 한두 문장으로(없으면 빈 문자열).
시간표가 아니면 rows를 비우고 note에 이유를 적어 주세요.`,
  },
  tuition: {
    schema: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: { name: str, amount: { type: "integer" }, class_name: str, memo: str, unsure: { type: "boolean" } },
            required: ["name", "amount", "class_name", "memo", "unsure"],
            additionalProperties: false,
          },
        },
        note: str,
      },
      required: ["rows", "note"],
      additionalProperties: false,
    },
    prompt: `이 사진은 한국 학원의 수강료(교습비) 안내표예요. 수강료 하나를 한 줄로 모두 적어 주세요.
- name: 과정 이름(예: 초등 주 3회, 중등 내신반). 학년 · 횟수가 표에 따로 있으면 합쳐서.
- amount: 한 달 수강료를 원 단위 정수로(예: "30만원" → 300000). 분기 · 회당 금액이면 그대로 적고 memo에 "3개월" · "회당"처럼 적고 unsure를 true로.
- class_name: 표에 반 이름이 있으면, 없으면 빈 문자열.
- memo: 교재비 별도 · 차량비 같은 덧붙임(없으면 빈 문자열).
- 글씨가 흐리거나 짐작한 칸이 있으면 unsure를 true로.
- note: 못 읽은 부분이나 원장님이 확인할 점을 한두 문장으로(없으면 빈 문자열).
수강료표가 아니면 rows를 비우고 note에 이유를 적어 주세요.`,
  },
  students: {
    schema: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: { name: str, grade: str, class_name: str, parent_name: str, parent_phone: str, phone: str, unsure: { type: "boolean" } },
            required: ["name", "grade", "class_name", "parent_name", "parent_phone", "phone", "unsure"],
            additionalProperties: false,
          },
        },
        note: str,
      },
      required: ["rows", "note"],
      additionalProperties: false,
    },
    prompt: `이 사진은 한국 학원의 원생 명단(종이 명부 · 출석부 · 프로그램 화면)이에요. 학생 한 명을 한 줄로 모두 적어 주세요.
- name: 학생 이름. 머리줄(이름 · 학년 · 연락처 같은 칸 이름)은 빼요.
- grade: 학년을 이 중 하나로: 미취학, 초1~초6, 중1~중3, 고1~고3, N수생, 대학생, 성인 · 직장인. 없으면 빈 문자열.
- class_name: 반 이름(예: 초등 A반). 없으면 빈 문자열.
- parent_name · parent_phone: 학부모 이름 · 연락처. phone: 학생 본인 연락처. 연락처는 "010-0000-0000" 모양으로, 하나뿐이고 누구 것인지 모르면 parent_phone에.
- 글씨가 흐리거나 짐작한 칸이 있으면 unsure를 true로.
- note: 못 읽은 부분이나 원장님이 확인할 점을 한두 문장으로(없으면 빈 문자열).
원생 명단이 아니면 rows를 비우고 note에 이유를 적어 주세요.`,
  },
  ledger: {
    schema: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: { day: str, kind: { type: "string", enum: ["out", "in"] }, category: str, amount: { type: "integer" }, memo: str, unsure: { type: "boolean" } },
            required: ["day", "kind", "category", "amount", "memo", "unsure"],
            additionalProperties: false,
          },
        },
        note: str,
      },
      required: ["rows", "note"],
      additionalProperties: false,
    },
    prompt: `이 사진은 한국 학원의 돈 기록이에요(영수증 한 장 · 손으로 쓴 장부 · 통장 거래내역 화면). 거래 하나를 한 줄로 적어 주세요.
- 영수증 한 장이면 합계(결제 금액) 한 줄만. 물건마다 나누지 마세요.
- day: "YYYY-MM-DD". 연도가 없으면 올해(${new Date().getFullYear()})로. 날짜가 없으면 빈 문자열로 두고 unsure를 true로.
- kind: 학원에서 나간 돈은 "out", 들어온 돈은 "in". 통장 내역의 잔액 칸은 금액이 아니에요.
- category: 나간 돈이면 "강사 급여", "임대료", "공과금", "통신비", "렌탈", "교재비", "비품", "홍보비", "세무 · 회계", "보험", "이자 · 할부", "구독", "차량·간식", "기타" 중 하나 그대로, 들어온 돈이면 "교재 판매", "특강", "방학 캠프", "입학금", "기타" 중 하나 그대로.
- amount: 원 단위 정수. memo: 가게 이름 · 거래 내용(짧게).
- 학생 수강료 입금은 수납에서 따로 관리하니 memo에 "수강료"라고 적고 unsure를 true로.
- 글씨가 흐리거나 짐작한 칸이 있으면 unsure를 true로.
- note: 못 읽은 부분이나 원장님이 확인할 점을 한두 문장으로(없으면 빈 문자열).
돈 기록이 아니면 rows를 비우고 note에 이유를 적어 주세요.`,
  },
};
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return reply("ok");
  if (req.method !== "POST") return reply({ error: "method" }, 405);

  // 로그인한 사람의 권한으로 DB를 불러요 (원장인지 · 남은 장수는 start_photo_read가 확인)
  const auth = req.headers.get("Authorization") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return reply({ error: "login" }, 401);

  let body: { kind?: string; image?: string; media_type?: string; academy_id?: string; level?: string; ocr_text?: string };
  try { body = await req.json(); } catch { return reply({ error: "bad_body" }, 400); }
  const cfg = KINDS[body.kind || ""];
  const media = body.media_type || "image/jpeg";
  if (!cfg || !body.image || !body.academy_id || !TYPES.includes(media)) return reply({ error: "bad_body" }, 400);
  if (body.image.length > 7_000_000) return reply({ error: "too_big" }, 413);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return reply({ error: "no_key" }, 503);

  // 한 장 쓰기 (이번 달 10장을 다 쓰면 photo_limit, 원장이 아니면 owner_only)
  const start = await sb.rpc("start_photo_read", { p_academy: body.academy_id, p_kind: body.kind });
  if (start.error) {
    const m = start.error.message || "";
    return reply({ error: m.includes("photo_limit") ? "photo_limit" : m.includes("owner_only") ? "owner_only" : "db" }, m.includes("photo_limit") ? 429 : 403);
  }
  const readId = start.data as string;
  const fail = async (data: Record<string, unknown>, status: number) => { await sb.rpc("cancel_photo_read", { p_id: readId }); return reply(data, status); };

  const client = new Anthropic({ apiKey: key });
  const hint = (body.ocr_text || "").slice(0, 4000).trim();
  const prompt = cfg.prompt + (hint ? `\n\n참고: 이 기기에서 먼저 글자 인식으로 읽은 글자예요. 틀린 글자가 많을 수 있으니 사진을 기준으로 하고, 흐린 글자를 알아보는 데만 참고하세요.\n"""\n${hint}\n"""` : "");
  const content = [
    { type: "image", source: { type: "base64", media_type: media, data: body.image } },
    { type: "text", text: prompt },
  ];
  // 한 번 읽기: 결과 { rows, note } 또는 null(거절 · 결과 없음)
  const ask = async (tier: "fast" | "precise") => {
    const res = tier === "fast"
      ? await client.messages.create({
          model: "claude-haiku-5-5",
          max_tokens: 16000,
          output_config: { effort: "low", format: { type: "json_schema", schema: cfg.schema } },
          messages: [{ role: "user", content }],
        } as any)
      : await client.beta.messages.create({
          model: "claude-sonnet-5-5",
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { format: { type: "json_schema", schema: cfg.schema } },
          messages: [{ role: "user", content }],
        } as any);
    if ((res as any).stop_reason === "refusal") return null;
    const text = (res as any).content.find((b: any) => b.type === "text");
    if (!text) return null;
    try { const o = JSON.parse(text.text); return { rows: Array.isArray(o.rows) ? o.rows : [], note: o.note || "" }; } catch { return null; }
  };
  // 빠른 AI 결과가 약하면(줄이 없거나 확인 필요가 30% 이상) 정확한 AI로
  const weak = (o: { rows: any[] } | null) => !o || !o.rows.length || o.rows.filter((r) => r.unsure).length / o.rows.length >= 0.3;
  try {
    let tier: "fast" | "precise" = body.level === "precise" ? "precise" : "fast";
    let out: { rows: any[]; note: string } | null = null;
    if (tier === "fast") {
      try { out = await ask("fast"); } catch (e) {
        if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.AuthenticationError) throw e;
        out = null; // 빠른 AI가 안 되면 정확한 AI로
      }
      if (weak(out)) { const better = await ask("precise"); tier = "precise"; if (better && (!out || better.rows.length)) out = better; }
    } else out = await ask("precise");
    if (!out) return fail({ error: "refused" }, 422);
    await sb.rpc("note_photo_read", { p_id: readId, p_tier: tier });
    const left = await sb.rpc("photo_read_left", { p_academy: body.academy_id });
    return reply({ rows: out.rows, note: out.note, tier, left: left.error ? undefined : left.data });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return fail({ error: "busy" }, 429);
    if (e instanceof Anthropic.AuthenticationError) return fail({ error: "no_key" }, 503);
    if (e instanceof Anthropic.APIError) return fail({ error: "api", status: e.status }, 502);
    return fail({ error: "parse" }, 502);
  }
});

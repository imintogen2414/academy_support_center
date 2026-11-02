-- 18라운드: 결제 · 통장 · 전문 앱 연결 준비, 상담 일지 · 단체 문자
-- 연결 계약(카드 단말기 · 키오스크 · 온라인 결제 · 계좌 조회)이 되면 Edge Function ext-feed가 연결 키로 받아서 여기에 넣어요.

-- 1) 바깥 연결: 학원마다 카드 결제(card) · 통장(bank) · 전문 앱(app) 하나씩
create table if not exists public.ext_links (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  kind text not null check (kind in ('card', 'bank', 'app')),
  provider text check (char_length(provider) <= 40),          -- 예: 토스플레이스 · KICC · 코드에프
  label text check (char_length(label) <= 60),                -- 예: 1층 결제 키오스크
  account_id uuid references public.fin_accounts (id) on delete set null, -- 들어간 돈을 넣을 통장
  status text not null default 'off' check (status in ('off', 'asked', 'on')), -- 연결 전 · 신청함 · 연결됨
  memo text check (char_length(memo) <= 300),                 -- 원장님이 센터에 남기는 말
  admin_memo text check (char_length(admin_memo) <= 300),     -- 센터가 남기는 말
  key_hash text, key_hint text,                               -- 연결 키는 해시만 (끝 4자리만 보여요)
  asked_at timestamptz, on_at timestamptz, last_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (academy_id, kind)
);
create index if not exists ext_links_key on public.ext_links (key_hash);
alter table public.ext_links enable row level security;
create policy "연결 보기" on public.ext_links for select to authenticated
  using (private.can_do(academy_id, case kind when 'card' then 'billing' when 'bank' then 'finance' else 'students' end)
         or private.academy_role(academy_id) in ('owner', 'teacher') and kind = 'app'
         or private.is_center_admin());
-- 쓰기는 RPC로만 (save_ext_link · make_ext_key · admin_set_ext_link)
revoke insert, update, delete on public.ext_links from authenticated;
grant select on public.ext_links to authenticated;

-- 2) 자동으로 들어온 돈: 카드 결제(단말기 · 키오스크 · 온라인) · 통장 거래
create table if not exists public.pay_feed (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  source text not null check (source in ('card', 'bank')),
  provider text check (char_length(provider) <= 40),
  kind text not null default 'in' check (kind in ('in', 'out')),
  amount integer not null check (amount > 0),
  happened_at timestamptz not null default now(),
  ref text check (char_length(ref) <= 80),       -- 승인번호 · 거래번호 (같은 것은 두 번 안 넣어요)
  payer text check (char_length(payer) <= 80),   -- 카드 주인 · 입금자 이름
  method text check (char_length(method) <= 20), -- 카드 · 계좌이체 · 간편결제
  card text check (char_length(card) <= 40),     -- 카드사
  memo text check (char_length(memo) <= 200),    -- 적요 · 상품 이름
  account_id uuid references public.fin_accounts (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'done', 'skip', 'cancel')),
  invoice_id uuid references public.invoices (id) on delete set null,
  income_id uuid references public.incomes (id) on delete set null,
  expense_id uuid references public.expenses (id) on delete set null,
  auto boolean not null default false,  -- 저절로 짝지음
  test boolean not null default false,  -- 시험으로 넣어 본 것 (실제 청구는 안 바꿔요)
  raw jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists pay_feed_ref on public.pay_feed (academy_id, source, ref) where ref is not null;
create index if not exists pay_feed_academy on public.pay_feed (academy_id, happened_at desc);
alter table public.pay_feed enable row level security;
create policy "들어온 돈 보기" on public.pay_feed for select to authenticated
  using (private.can_do(academy_id, case source when 'card' then 'billing' else 'finance' end) or private.can_do(academy_id, 'finance'));
create policy "들어온 돈 정리" on public.pay_feed for update to authenticated
  using (private.can_do(academy_id, case source when 'card' then 'billing' else 'finance' end) or private.can_do(academy_id, 'finance'))
  with check (private.can_do(academy_id, case source when 'card' then 'billing' else 'finance' end) or private.can_do(academy_id, 'finance'));
create policy "시험 결제 지우기" on public.pay_feed for delete to authenticated
  using (test and (private.can_do(academy_id, 'billing') or private.can_do(academy_id, 'finance')));
revoke insert, update, delete on public.pay_feed from authenticated;
grant select, delete on public.pay_feed to authenticated;
grant update (status, invoice_id, income_id, expense_id, account_id) on public.pay_feed to authenticated;

-- 이름 비교 (띄어쓰기 빼고)
create or replace function private.nm(p text) returns text language sql immutable set search_path = '' as $$
  select lower(regexp_replace(coalesce(p, ''), '\s', '', 'g')) $$;

-- 들어오자마자 미납 청구와 짝짓기: 금액이 같고 (이름이 맞거나 · 카드는 그 달 같은 금액이 하나뿐이면)
create or replace function private.pay_feed_match() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_inv uuid; v_n int; v_day date := (new.happened_at at time zone 'Asia/Seoul')::date; v_acct uuid; p text := private.nm(new.payer);
begin
  if new.kind <> 'in' or new.status <> 'new' or new.test then return new; end if;
  -- 이름이 맞는 미납 (입금자 이름에 학생 · 학부모 이름이 들어 있거나 그 반대)
  select count(*), min(i.id::text)::uuid into v_n, v_inv from public.invoices i left join public.students s on s.id = i.student_id
   where i.academy_id = new.academy_id and i.paid_at is null and i.amount = new.amount and p <> ''
     and (p like '%' || private.nm(i.student_name) || '%' or private.nm(i.student_name) like '%' || p || '%'
          or (s.parent_name is not null and private.nm(s.parent_name) <> '' and p like '%' || private.nm(s.parent_name) || '%'));
  if v_n <> 1 and new.source = 'card' then
    -- 카드는 이름이 없을 때가 많아서: 그 달 같은 금액 미납이 하나뿐이면
    select count(*), min(i.id::text)::uuid into v_n, v_inv from public.invoices i
     where i.academy_id = new.academy_id and i.paid_at is null and i.amount = new.amount and i.month = to_char(v_day, 'YYYY-MM');
  end if;
  if v_n = 1 then
    v_acct := coalesce(new.account_id, (select account_id from public.ext_links where academy_id = new.academy_id and kind = new.source));
    update public.invoices set paid_at = least(v_day, (now() at time zone 'Asia/Seoul')::date),
           method = case when new.source = 'card' then '카드' else '계좌이체' end,
           pay_ref = coalesce(new.ref, pay_ref), account_id = coalesce(v_acct, account_id),
           memo = left(concat_ws(' · ', nullif(memo, ''), case when new.source = 'card' then '카드 자동 연결' else '통장 자동 연결' end || coalesce(' ' || new.card, '') || coalesce(' 승인 ' || new.ref, '')), 300)
     where id = v_inv;
    new.status := 'done'; new.invoice_id := v_inv; new.auto := true; new.account_id := v_acct;
  end if;
  return new;
end $$;
drop trigger if exists pay_feed_match on public.pay_feed;
create trigger pay_feed_match before insert on public.pay_feed for each row execute function private.pay_feed_match();

-- 연결 설정 · 신청 (원장만)
create or replace function public.save_ext_link(p_academy uuid, p_kind text, p_provider text, p_label text, p_account uuid, p_memo text, p_ask boolean)
returns public.ext_links language plpgsql security definer set search_path = '' as $$
declare r public.ext_links;
begin
  if private.academy_role(p_academy) is distinct from 'owner' then raise exception 'not_owner'; end if;
  if p_kind not in ('card', 'bank', 'app') then raise exception 'bad_kind'; end if;
  if p_account is not null and not exists (select 1 from public.fin_accounts where id = p_account and academy_id = p_academy) then raise exception 'bad_account'; end if;
  insert into public.ext_links (academy_id, kind, provider, label, account_id, memo, status, asked_at)
    values (p_academy, p_kind, left(p_provider, 40), left(p_label, 60), p_account, left(p_memo, 300), case when p_ask then 'asked' else 'off' end, case when p_ask then now() end)
  on conflict (academy_id, kind) do update set provider = excluded.provider, label = excluded.label, account_id = excluded.account_id, memo = excluded.memo,
    status = case when ext_links.status = 'on' then 'on' when p_ask then 'asked' else ext_links.status end,
    asked_at = case when p_ask and ext_links.status <> 'on' then now() else ext_links.asked_at end, updated_at = now()
  returning * into r;
  return r;
end $$;
-- 연결 키 만들기 (원장만, 만들 때 한 번만 보여요 — 다시 만들면 예전 키는 못 써요)
create or replace function public.make_ext_key(p_academy uuid, p_kind text) returns text
language plpgsql security definer set search_path = '' as $$
declare k text := 'asc_' || p_kind || '_' || encode(extensions.gen_random_bytes(24), 'hex');
begin
  if private.academy_role(p_academy) is distinct from 'owner' then raise exception 'not_owner'; end if;
  if p_kind not in ('card', 'bank', 'app') then raise exception 'bad_kind'; end if;
  insert into public.ext_links (academy_id, kind, status) values (p_academy, p_kind, 'off') on conflict (academy_id, kind) do nothing;
  update public.ext_links set key_hash = encode(extensions.digest(k, 'sha256'), 'hex'), key_hint = right(k, 4), updated_at = now()
   where academy_id = p_academy and kind = p_kind;
  return k;
end $$;
-- 시험 결제 넣어 보기: 실제 청구는 바꾸지 않고, 어떤 청구와 짝이 맞는지만 보여 줘요
create or replace function public.ext_feed_test(p_academy uuid, p_source text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; i record;
begin
  if p_source not in ('card', 'bank') then raise exception 'bad_source'; end if;
  if not private.can_do(p_academy, case p_source when 'card' then 'billing' else 'finance' end) then raise exception 'not_allowed'; end if;
  select * into i from public.invoices where academy_id = p_academy and paid_at is null order by month desc, created_at limit 1;
  insert into public.pay_feed (academy_id, source, provider, kind, amount, happened_at, ref, payer, method, card, memo, test)
    values (p_academy, p_source, '시험', 'in', coalesce(i.amount, 250000), now(), 'TEST-' || to_char(now(), 'MMDDHH24MISS'),
            coalesce(i.student_name, '홍길동'), case p_source when 'card' then '카드' else '계좌이체' end,
            case p_source when 'card' then '신한카드' end, case p_source when 'card' then '수강료 (시험 결제)' else '입금 (시험)' end, true)
    returning id into v_id;
  return v_id;
end $$;
-- 센터: 연결 신청 모아 보기 · 상태 바꾸기
create or replace function public.admin_ext_links() returns table (id uuid, academy_id uuid, academy_name text, kind text, provider text, label text, status text, memo text, admin_memo text, asked_at timestamptz, on_at timestamptz, last_at timestamptz, has_key boolean)
language sql stable security definer set search_path = '' as $$
  select l.id, l.academy_id, a.name, l.kind, l.provider, l.label, l.status, l.memo, l.admin_memo, l.asked_at, l.on_at, l.last_at, l.key_hash is not null
    from public.ext_links l join public.academies a on a.id = l.academy_id
   where private.is_center_admin() and (l.status <> 'off' or l.key_hash is not null)
   order by (l.status = 'asked') desc, l.asked_at desc nulls last $$;
create or replace function public.admin_set_ext_link(p_id uuid, p_status text, p_memo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_center_admin() then raise exception 'not_admin'; end if;
  if p_status not in ('off', 'asked', 'on') then raise exception 'bad_status'; end if;
  update public.ext_links set status = p_status, admin_memo = left(p_memo, 300), on_at = case when p_status = 'on' then coalesce(on_at, now()) else on_at end, updated_at = now() where id = p_id;
end $$;

-- 결제가 취소되면 그 결제로 넣은 납부 확인을 풀어요 (지금은 ext-feed가 같은 일을 직접 해서 쓰지 않아요)
create or replace function private.feed_cancel(p_academy uuid, p_source text, p_ref text) returns void
language plpgsql security definer set search_path = '' as $$
declare f record;
begin
  select * into f from public.pay_feed where academy_id = p_academy and source = p_source and ref = p_ref;
  if not found then return; end if;
  if f.invoice_id is not null then
    update public.invoices set paid_at = null, method = null, pay_ref = null, memo = left(concat_ws(' · ', nullif(memo, ''), '결제 취소됨 ' || to_char(now() at time zone 'Asia/Seoul', 'MM/DD')), 300)
     where id = f.invoice_id and pay_ref is not distinct from p_ref;
  end if;
  update public.pay_feed set status = 'cancel' where id = f.id;
end $$;
revoke execute on function private.feed_cancel(uuid, text, text) from public, anon, authenticated;

-- 3) 전문 앱 기록: 시험 · 퀴즈 · 숙제 · 공부 시간 … → 성적표 · 학생 한 명 보기 · 성장 리포트
create table if not exists public.app_records (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  app text not null default 'pro' check (char_length(app) <= 40),
  kind text not null default 'test' check (kind in ('test', 'quiz', 'homework', 'study', 'attend', 'memo', 'etc')),
  title text not null check (char_length(title) between 1 and 100),
  subject text check (char_length(subject) <= 40),
  score numeric check (score >= 0), max_score numeric check (max_score > 0),
  level text check (char_length(level) <= 40),   -- 등급 · 단계 · 레벨
  minutes integer check (minutes >= 0),          -- 공부한 시간(분)
  detail jsonb,                                  -- 문항별 결과 등 앱이 주는 것 그대로
  happened_at timestamptz not null default now(),
  ext_id text check (char_length(ext_id) <= 80), -- 앱 쪽 번호 (같은 기록은 한 번만)
  created_at timestamptz not null default now()
);
create unique index if not exists app_records_ext on public.app_records (academy_id, app, ext_id) where ext_id is not null;
create index if not exists app_records_student on public.app_records (student_id, happened_at desc);
alter table public.app_records enable row level security;
create policy "앱 기록 보기" on public.app_records for select to authenticated
  using (private.can_see_student(student_id) or private.is_my_child(student_id));
-- 같은 Supabase를 쓰는 전문 앱은 로그인한 학생 · 선생님으로 바로 넣어요
create policy "앱 기록 넣기" on public.app_records for insert to authenticated
  with check (exists (select 1 from public.students s where s.id = student_id and s.academy_id = app_records.academy_id)
              and (private.can_see_student(student_id) or private.is_my_child(student_id) and private.academy_role(academy_id) = 'student'));
create policy "앱 기록 지우기" on public.app_records for delete to authenticated using (private.can_see_student(student_id));
revoke insert, update, delete on public.app_records from authenticated;
grant select, delete on public.app_records to authenticated;
grant insert (academy_id, student_id, app, kind, title, subject, score, max_score, level, minutes, detail, happened_at, ext_id) on public.app_records to authenticated;

-- 4) 상담 일지 · 문자 받기 동의 · 단체 문자 기록
alter table public.leads add column if not exists sms_ok boolean not null default false;
alter table public.leads add column if not exists sms_ok_at timestamptz;
grant insert (sms_ok, sms_ok_at) on public.leads to authenticated;
grant update (sms_ok, sms_ok_at) on public.leads to authenticated;
alter table public.students add column if not exists sms_ok boolean not null default false;
grant insert (sms_ok) on public.students to authenticated;
grant update (sms_ok) on public.students to authenticated;

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  kind text not null default 'memo' check (kind in ('call', 'visit', 'msg', 'test', 'trial', 'memo')),
  day date not null default ((now() at time zone 'Asia/Seoul')::date),
  body text not null check (char_length(body) between 1 and 1000),
  by_id uuid default auth.uid(), by_name text,
  created_at timestamptz not null default now()
);
create index if not exists lead_notes_lead on public.lead_notes (lead_id, day desc);
alter table public.lead_notes enable row level security;
create policy "상담 일지 보기" on public.lead_notes for select to authenticated using (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "상담 일지 쓰기" on public.lead_notes for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher') and exists (select 1 from public.leads l where l.id = lead_id and l.academy_id = lead_notes.academy_id));
create policy "상담 일지 지우기" on public.lead_notes for delete to authenticated
  using (by_id = (select auth.uid()) or private.academy_role(academy_id) = 'owner');
revoke insert, update, delete on public.lead_notes from authenticated;
grant select, delete on public.lead_notes to authenticated;
grant insert (academy_id, lead_id, kind, day, body) on public.lead_notes to authenticated;
create or replace function private.lead_note_stamp() returns trigger language plpgsql security definer set search_path = '' as $$
begin new.by_id := (select auth.uid()); new.by_name := private.who_label(); return new; end $$;
drop trigger if exists lead_note_stamp on public.lead_notes;
create trigger lead_note_stamp before insert on public.lead_notes for each row execute function private.lead_note_stamp();

create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  by_id uuid, by_name text,
  ad boolean not null default false,
  body text not null,
  total integer not null default 0, sent integer not null default 0, failed integer not null default 0,
  target text check (char_length(target) <= 100), -- 예: 상담 중 12명
  created_at timestamptz not null default now()
);
create index if not exists sms_logs_academy on public.sms_logs (academy_id, created_at desc);
alter table public.sms_logs enable row level security;
create policy "문자 기록 보기" on public.sms_logs for select to authenticated using (private.academy_role(academy_id) in ('owner', 'teacher'));
revoke insert, update, delete on public.sms_logs from authenticated;
grant select on public.sms_logs to authenticated;
-- 이번 달 보낸 수 (학원마다 한 달 500건, 센터 관리자는 제한 없음)
create or replace function public.sms_left(p_academy uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case when private.is_center_admin() then null
    when coalesce(private.academy_role(p_academy), '') not in ('owner', 'teacher') then 0
    else greatest(500 - coalesce((select sum(sent)::int from public.sms_logs where academy_id = p_academy
      and created_at >= date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'), 0), 0) end $$;

grant execute on function public.save_ext_link(uuid, text, text, text, uuid, text, boolean) to authenticated;
grant execute on function public.make_ext_key(uuid, text) to authenticated;
grant execute on function public.ext_feed_test(uuid, text) to authenticated;
grant execute on function public.admin_ext_links() to authenticated;
grant execute on function public.admin_set_ext_link(uuid, text, text) to authenticated;
grant execute on function public.sms_left(uuid) to authenticated;
revoke execute on function public.save_ext_link(uuid, text, text, text, uuid, text, boolean) from anon, public;
revoke execute on function public.make_ext_key(uuid, text) from anon, public;
revoke execute on function public.ext_feed_test(uuid, text) from anon, public;
revoke execute on function public.admin_ext_links() from anon, public;
revoke execute on function public.admin_set_ext_link(uuid, text, text) from anon, public;
revoke execute on function public.sms_left(uuid) from anon, public;

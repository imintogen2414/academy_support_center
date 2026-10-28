-- 16라운드
-- 1) 통장(계좌): 재정 보고서처럼 통장마다 전월 잔액 · 입금 · 출금 · 거래 후 잔액을 봐요 (재정 권한)
create table if not exists public.fin_accounts (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),      -- 별칭 (예: 사업자통장)
  bank text check (char_length(bank) <= 40),                           -- 계좌 (예: 하나 기업)
  opening integer not null default 0,                                  -- 기준일 잔액
  opening_on date not null default current_date,                       -- 기준일 (이 날 아침 잔액)
  note text check (char_length(note) <= 200),                          -- 쓰는 곳 (예: 원비 / 공과금)
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists fin_accounts_academy on public.fin_accounts (academy_id);
alter table public.fin_accounts enable row level security;
create policy "재정 권한이 통장을 봐요" on public.fin_accounts for select using (private.can_do(academy_id, 'finance'));
create policy "재정 권한이 통장을 넣어요" on public.fin_accounts for insert with check (private.can_do(academy_id, 'finance'));
create policy "재정 권한이 통장을 고쳐요" on public.fin_accounts for update using (private.can_do(academy_id, 'finance')) with check (private.can_do(academy_id, 'finance'));
create policy "재정 권한이 통장을 지워요" on public.fin_accounts for delete using (private.can_do(academy_id, 'finance'));
grant select, delete on public.fin_accounts to authenticated;
grant insert (academy_id, name, bank, opening, opening_on, note, sort_order) on public.fin_accounts to authenticated;
grant update (name, bank, opening, opening_on, note, sort_order) on public.fin_accounts to authenticated;

alter table public.expenses add column if not exists account_id uuid references public.fin_accounts(id) on delete set null;
alter table public.incomes add column if not exists account_id uuid references public.fin_accounts(id) on delete set null;
alter table public.invoices add column if not exists account_id uuid references public.fin_accounts(id) on delete set null;
create index if not exists expenses_account on public.expenses (account_id);
create index if not exists incomes_account on public.incomes (account_id);
create index if not exists invoices_account on public.invoices (account_id);
grant insert (account_id) on public.expenses to authenticated;
grant update (account_id) on public.expenses to authenticated;
grant insert (account_id) on public.incomes to authenticated;
grant update (account_id) on public.incomes to authenticated;
grant insert (account_id) on public.invoices to authenticated;
grant update (account_id) on public.invoices to authenticated;

-- 2) 수강생 관리 양식: 성별 · 수강 시작일 · 마무리일 · 구분(스파르타/일반) · 오전/오후
alter table public.students
  add column if not exists gender text check (gender in ('남', '여')),
  add column if not exists course_from date,
  add column if not exists course_to date,
  add column if not exists track text check (char_length(track) <= 30),
  add column if not exists session text check (char_length(session) <= 20);
grant insert (gender, course_from, course_to, track, session) on public.students to authenticated;
grant update (gender, course_from, course_to, track, session) on public.students to authenticated;

-- 3) 환불: 청구마다 돌려준 금액 · 내역 · 날짜 (재정에서는 나간 돈으로 잡아요)
alter table public.invoices
  add column if not exists refund integer not null default 0 check (refund >= 0),
  add column if not exists refund_note text check (char_length(refund_note) <= 200),
  add column if not exists refunded_on date;
grant insert (refund, refund_note, refunded_on) on public.invoices to authenticated;
grant update (refund, refund_note, refunded_on) on public.invoices to authenticated;

-- 4) 자료실 읽음 확인: 누가 미리보기 · 다운로드했는지 (처음 연 시각 + 연 횟수)
create table if not exists public.library_reads (
  item_id uuid not null references public.library_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  opens integer not null default 1,
  primary key (item_id, user_id)
);
create index if not exists library_reads_user on public.library_reads (user_id);
alter table public.library_reads enable row level security;
create policy "내 자료 읽음만 봐요" on public.library_reads for select using (user_id = (select auth.uid()));
grant select on public.library_reads to authenticated;

create or replace function public.mark_library_read(p_item uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare it record;
begin
  select * into it from public.library_items where id = p_item;
  if not found or not private.can_see_library(it.academy_id, it.visibility, it.target_class, it.uploaded_by) then raise exception 'not_allowed'; end if;
  insert into public.library_reads (item_id, user_id) values (p_item, (select auth.uid()))
    on conflict (item_id, user_id) do update set last_at = now(), opens = public.library_reads.opens + 1;
end $$;

-- 이 자료를 볼 수 있는 사람 (공유 범위대로): 원장 · 올린 사람 · 강사(staff/class/everyone) · 반 학부모 · 학생(class) · 모두(everyone)
create or replace function private.library_audience(p_item uuid)
returns table (user_id uuid) language sql stable security definer set search_path = '' as $$
  select distinct m.user_id
  from public.library_items it
  join public.academy_members m on m.academy_id = it.academy_id
  where it.id = p_item and (
    m.role = 'owner' or m.user_id = it.uploaded_by
    or (it.visibility in ('staff', 'class', 'everyone') and m.role = 'teacher')
    or (it.visibility = 'everyone')
    or (it.visibility = 'class' and m.role in ('parent', 'student') and exists (
          select 1 from public.student_links l join public.students s on s.id = l.student_id
          where l.user_id = m.user_id and s.academy_id = it.academy_id and s.class_name = it.target_class))
  );
$$;

-- 읽은 사람 · 안 읽은 사람 (올린 사람과 원장만)
create or replace function public.library_readers(p_item uuid)
returns table (name text, role text, read_at timestamptz, last_at timestamptz, opens integer)
language sql stable security definer set search_path = '' as $$
  select coalesce(p.name, p.username, '이름 없음'), m.role, r.read_at, r.last_at, coalesce(r.opens, 0)
  from public.library_items it
  join private.library_audience(p_item) a on true
  join public.academy_members m on m.academy_id = it.academy_id and m.user_id = a.user_id
  left join public.profiles p on p.id = a.user_id
  left join public.library_reads r on r.item_id = p_item and r.user_id = a.user_id
  where it.id = p_item and (it.uploaded_by = (select auth.uid()) or private.academy_role(it.academy_id) = 'owner')
  order by r.read_at nulls first, p.name;
$$;

-- 목록에 "읽음 3/12": 내가 올린 자료(원장은 모든 자료)
create or replace function public.library_read_counts(p_academy uuid)
returns table (item_id uuid, total integer, read integer)
language sql stable security definer set search_path = '' as $$
  select it.id,
    (select count(*) from private.library_audience(it.id) a where a.user_id <> it.uploaded_by)::int,
    (select count(*) from public.library_reads r where r.item_id = it.id and r.user_id <> it.uploaded_by)::int
  from public.library_items it
  where it.academy_id = p_academy and (it.uploaded_by = (select auth.uid()) or private.academy_role(p_academy) = 'owner');
$$;

revoke execute on function private.library_audience(uuid) from public, anon, authenticated;
revoke execute on function public.mark_library_read(uuid) from public, anon;
revoke execute on function public.library_readers(uuid) from public, anon;
revoke execute on function public.library_read_counts(uuid) from public, anon;
grant execute on function public.mark_library_read(uuid) to authenticated;
grant execute on function public.library_readers(uuid) to authenticated;
grant execute on function public.library_read_counts(uuid) to authenticated;

-- 5) 결재가 끝난 것도 원장(결재 처리 권한)이 고쳐요 — 연결된 재정 지출 금액 · 내용도 함께, 고친 사람 · 시각은 남겨요
alter table public.approvals
  add column if not exists edited_at timestamptz,
  add column if not exists edited_by_name text;

create or replace function public.edit_approval(p_id uuid, p_kind text, p_title text, p_amount integer, p_detail text, p_want_by date, p_comment text)
returns void language plpgsql security definer set search_path = '' as $$
declare a record; who text;
begin
  select * into a from public.approvals where id = p_id for update;
  if not found or not private.can_do(a.academy_id, 'approvals') then raise exception 'owner_only'; end if;
  if nullif(trim(coalesce(p_title, '')), '') is null then raise exception 'title_required'; end if;
  if p_amount is not null and p_amount < 0 then raise exception 'bad_amount'; end if;
  if p_kind not in ('물품 구입', '재정 지출', '기타') then raise exception 'bad_kind'; end if;
  select coalesce(p.name, p.username) into who from public.profiles p where p.id = (select auth.uid());
  update public.approvals set kind = p_kind, title = left(trim(p_title), 100), amount = p_amount,
    detail = nullif(left(trim(coalesce(p_detail, '')), 2000), ''), want_by = p_want_by,
    owner_comment = case when a.status = 'pending' then a.owner_comment else nullif(left(trim(coalesce(p_comment, '')), 500), '') end,
    edited_at = now(), edited_by_name = who
  where id = p_id;
  -- 승인하면서 넣은 지출도 같이 맞춰요 (재정 권한이 있을 때)
  if a.expense_id is not null and private.can_do(a.academy_id, 'finance') then
    update public.expenses set amount = coalesce(p_amount, 0),
      memo = left(format('결재: %s (%s)', trim(p_title), coalesce(a.requester_name, '강사')), 200)
    where id = a.expense_id;
  end if;
end $$;
revoke execute on function public.edit_approval(uuid, text, text, integer, text, date, text) from public, anon;
grant execute on function public.edit_approval(uuid, text, text, integer, text, date, text) to authenticated;

-- 6) 고정 지출도 나가는 통장을 정해요 → 저절로 넣는 지출에도 그 통장
alter table public.fixed_costs add column if not exists account_id uuid references public.fin_accounts(id) on delete set null;
grant insert (account_id) on public.fixed_costs to authenticated;
grant update (account_id) on public.fixed_costs to authenticated;

create or replace function private.run_fixed_costs(p_academy uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  ym text := to_char((now() at time zone 'Asia/Seoul')::date, 'YYYY-MM');
  last_d int := extract(day from (date_trunc('month', today) + interval '1 month - 1 day'))::int;
  f record; v_day int; total int := 0; a record; gap int;
begin
  for a in select distinct academy_id from public.fixed_costs where active and (p_academy is null or academy_id = p_academy) loop
    declare names text[] := '{}'; begin
      for f in select * from public.fixed_costs
                where academy_id = a.academy_id and active and start_month <= ym and (end_month is null or end_month >= ym)
                  and (last_month is null or last_month < ym) order by pay_day loop
        -- 몇 달마다 나가는 것: 시작하는 달부터 셌을 때 간격이 맞는 달에만
        gap := (extract(year from to_date(ym, 'YYYY-MM'))::int * 12 + extract(month from to_date(ym, 'YYYY-MM'))::int)
             - (extract(year from to_date(f.start_month, 'YYYY-MM'))::int * 12 + extract(month from to_date(f.start_month, 'YYYY-MM'))::int);
        continue when gap % greatest(coalesce(f.every_months, 1), 1) <> 0;
        v_day := least(f.pay_day, last_d);
        if extract(day from today) >= v_day then
          insert into public.expenses (academy_id, day, category, amount, memo, fixed_id, fixed_month, need_check, account_id)
            values (f.academy_id, make_date(extract(year from today)::int, extract(month from today)::int, v_day), f.category, f.amount,
                    left(f.name || coalesce(' · ' || f.method, '') || ' · 고정 지출', 200), f.id, ym, f.vary, f.account_id);
          update public.fixed_costs set last_month = ym where id = f.id;
          names := names || f.name;
        end if;
      end loop;
      if cardinality(names) > 0 then
        insert into public.auto_logs (academy_id, kind, key, message)
          values (a.academy_id, 'fixed', 'fixed:' || ym || ':' || gen_random_uuid(),
                  to_char(today, 'FMMM') || '월 고정 지출 ' || cardinality(names) || '건(' || array_to_string(names[1:4], ' · ') || case when cardinality(names) > 4 then ' …' else '' end || ')을 지출에 넣었어요');
        total := total + cardinality(names);
      end if;
    end;
  end loop;
  return total;
end $$;


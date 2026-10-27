-- 13라운드
-- 1) 고정 지출: 월세 · 관리비 · 공과금 · 인터넷 · 렌탈 · 기장료처럼 매달 나가는 돈을 한 번 넣어 두면
--    매달 정한 날에 재정 "지출"로 저절로 들어가요 (금액이 달마다 다르면 "금액 확인" 표시).
create table if not exists public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  category text not null default '임대료' check (char_length(category) <= 30),
  amount integer not null check (amount >= 0),
  pay_day smallint not null default 25 check (pay_day between 1 and 31), -- 31 = 말일
  method text check (char_length(method) <= 30),
  vary boolean not null default false,          -- 달마다 금액이 달라요 (관리비 · 전기 …)
  start_month text not null default to_char((now() at time zone 'Asia/Seoul')::date, 'YYYY-MM') check (start_month ~ '^\d{4}-\d{2}$'),
  end_month text check (end_month ~ '^\d{4}-\d{2}$'),
  active boolean not null default true,
  memo text check (char_length(memo) <= 200),
  last_month text,                              -- 마지막으로 지출에 넣은 달 (지운 지출을 다시 넣지 않게)
  created_at timestamptz not null default now()
);
create index if not exists fixed_costs_academy on public.fixed_costs (academy_id);
alter table public.fixed_costs enable row level security;
create policy "재정 권한이 고정 지출을 봐요" on public.fixed_costs for select using (private.can_do(academy_id, 'finance'));
create policy "재정 권한이 고정 지출을 넣어요" on public.fixed_costs for insert with check (private.can_do(academy_id, 'finance'));
create policy "재정 권한이 고정 지출을 고쳐요" on public.fixed_costs for update using (private.can_do(academy_id, 'finance')) with check (private.can_do(academy_id, 'finance'));
create policy "재정 권한이 고정 지출을 지워요" on public.fixed_costs for delete using (private.can_do(academy_id, 'finance'));
revoke all on public.fixed_costs from anon, authenticated;
grant select, delete on public.fixed_costs to authenticated;
grant insert (academy_id, name, category, amount, pay_day, method, vary, start_month, end_month, active, memo) on public.fixed_costs to authenticated;
grant update (name, category, amount, pay_day, method, vary, start_month, end_month, active, memo) on public.fixed_costs to authenticated;

alter table public.expenses add column if not exists fixed_id uuid references public.fixed_costs(id) on delete set null;
alter table public.expenses add column if not exists fixed_month text;
alter table public.expenses add column if not exists need_check boolean not null default false;
grant update (need_check) on public.expenses to authenticated;

-- 고정 지출 → 지출 (이번 달, 정한 날이 지났고 아직 안 넣었으면)
create or replace function private.run_fixed_costs(p_academy uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  ym text := to_char((now() at time zone 'Asia/Seoul')::date, 'YYYY-MM');
  last_d int := extract(day from (date_trunc('month', today) + interval '1 month - 1 day'))::int;
  f record; v_day int; total int := 0; a record;
begin
  for a in select distinct academy_id from public.fixed_costs where active and (p_academy is null or academy_id = p_academy) loop
    declare names text[] := '{}'; begin
      for f in select * from public.fixed_costs
                where academy_id = a.academy_id and active and start_month <= ym and (end_month is null or end_month >= ym)
                  and (last_month is null or last_month < ym) order by pay_day loop
        v_day := least(f.pay_day, last_d);
        if extract(day from today) >= v_day then
          insert into public.expenses (academy_id, day, category, amount, memo, fixed_id, fixed_month, need_check)
            values (f.academy_id, make_date(extract(year from today)::int, extract(month from today)::int, v_day), f.category, f.amount,
                    left(f.name || coalesce(' · ' || f.method, '') || ' · 고정 지출', 200), f.id, ym, f.vary);
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

-- 화면을 열 때 · "지금 반영" 버튼 (재정 권한)
create or replace function public.apply_fixed_costs(p_academy uuid)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_do(p_academy, 'finance') then raise exception 'no_permission'; end if;
  return private.run_fixed_costs(p_academy);
end $$;
revoke all on function public.apply_fixed_costs(uuid) from public, anon;
grant execute on function public.apply_fixed_costs(uuid) to authenticated;

select cron.schedule('asc-automations', '10 0 * * *', $$select private.run_automations(); select private.run_fixed_costs();$$);

-- 2) 비품 · 교재 관리: 교재 · 도서 · 문구 · 전자기기 · 가구 · 청소 · 간식 … 수량 · 둔 곳 · 부족 알림 + 들어옴 · 씀 · 빌려줌 · 돌려받음 기록
create table if not exists public.supplies (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text not null default '교재 · 도서' check (char_length(category) <= 30),
  qty integer not null default 0 check (qty >= 0),
  unit text not null default '개' check (char_length(unit) <= 10),
  min_qty integer not null default 0 check (min_qty >= 0),   -- 이보다 적으면 "부족"
  place text check (char_length(place) <= 40),
  price integer check (price >= 0),                         -- 하나 값 (살 때 지출 계산)
  memo text check (char_length(memo) <= 300),
  lent integer not null default 0 check (lent >= 0),        -- 빌려준 수
  updated_at timestamptz not null default now(),
  updated_by_name text,
  created_at timestamptz not null default now()
);
create index if not exists supplies_academy on public.supplies (academy_id);
alter table public.supplies enable row level security;
create policy "원장·강사가 비품을 봐요" on public.supplies for select using (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장·강사가 비품을 넣어요" on public.supplies for insert with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장·강사가 비품을 고쳐요" on public.supplies for update using (private.academy_role(academy_id) in ('owner', 'teacher')) with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장이 비품을 지워요" on public.supplies for delete using (private.academy_role(academy_id) = 'owner');
revoke all on public.supplies from anon, authenticated;
grant select, delete on public.supplies to authenticated;
grant insert (academy_id, name, category, qty, unit, min_qty, place, price, memo) on public.supplies to authenticated;
grant update (name, category, unit, min_qty, place, price, memo) on public.supplies to authenticated;

create or replace function private.supply_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin new.updated_at := now(); new.updated_by_name := private.who_label(); return new; end $$;
drop trigger if exists supplies_stamp on public.supplies;
create trigger supplies_stamp before insert or update on public.supplies for each row execute function private.supply_stamp();

create table if not exists public.supply_logs (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  supply_id uuid references public.supplies(id) on delete cascade,
  kind text not null check (kind in ('in', 'out', 'lend', 'return', 'fix')),
  qty integer not null,
  who text check (char_length(who) <= 50),      -- 빌려 간 사람 · 쓴 반
  memo text check (char_length(memo) <= 200),
  expense_id uuid references public.expenses(id) on delete set null,
  by_name text,
  created_at timestamptz not null default now()
);
create index if not exists supply_logs_item on public.supply_logs (supply_id, created_at desc);
alter table public.supply_logs enable row level security;
create policy "원장·강사가 비품 기록을 봐요" on public.supply_logs for select using (private.academy_role(academy_id) in ('owner', 'teacher'));
revoke all on public.supply_logs from anon, authenticated;
grant select on public.supply_logs to authenticated;

-- 수량 바꾸기: in 들어옴(산 것은 지출에도) · out 씀 · lend 빌려줌 · return 돌려받음 · fix 수량 맞춤(실제로 센 수)
create or replace function public.move_supply(p_item uuid, p_kind text, p_qty int, p_who text default null, p_memo text default null, p_cost int default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.supplies; v_exp uuid; v_qty int; v_lent int;
begin
  select * into s from public.supplies where id = p_item for update;
  if s.id is null or coalesce(private.academy_role(s.academy_id), '') not in ('owner', 'teacher') then raise exception 'no_permission'; end if;
  if p_qty is null or p_qty < 0 or (p_kind <> 'fix' and p_qty = 0) then raise exception 'bad_qty'; end if;
  v_qty := s.qty; v_lent := s.lent;
  if p_kind = 'in' then v_qty := v_qty + p_qty;
  elsif p_kind = 'out' then if p_qty > v_qty then raise exception 'not_enough'; end if; v_qty := v_qty - p_qty;
  elsif p_kind = 'lend' then if p_qty > v_qty then raise exception 'not_enough'; end if; v_qty := v_qty - p_qty; v_lent := v_lent + p_qty;
  elsif p_kind = 'return' then if p_qty > v_lent then raise exception 'not_lent'; end if; v_qty := v_qty + p_qty; v_lent := v_lent - p_qty;
  elsif p_kind = 'fix' then v_qty := p_qty;
  else raise exception 'bad_kind'; end if;
  -- 사서 들어온 것: 재정 권한이 있으면 지출에도 (비품 · 교재비)
  if p_kind = 'in' and coalesce(p_cost, 0) > 0 then
    if not private.can_do(s.academy_id, 'finance') then raise exception 'no_finance'; end if;
    insert into public.expenses (academy_id, day, category, amount, memo)
      values (s.academy_id, (now() at time zone 'Asia/Seoul')::date, case when s.category like '교재%' then '교재비' else '비품' end, p_cost,
              left(s.name || ' ' || p_qty || s.unit || ' 구입' || coalesce(' · ' || p_memo, ''), 200))
      returning id into v_exp;
  end if;
  update public.supplies set qty = v_qty, lent = v_lent, updated_at = now(), updated_by_name = private.who_label() where id = s.id;
  insert into public.supply_logs (academy_id, supply_id, kind, qty, who, memo, expense_id, by_name)
    values (s.academy_id, s.id, p_kind, case when p_kind = 'fix' then p_qty - s.qty else p_qty end, nullif(trim(p_who), ''), nullif(trim(p_memo), ''), v_exp, private.who_label());
  return jsonb_build_object('qty', v_qty, 'lent', v_lent, 'expense_id', v_exp);
end $$;
revoke all on function public.move_supply(uuid, text, int, text, text, int) from public, anon;
grant execute on function public.move_supply(uuid, text, int, text, text, int) to authenticated;

-- 3) 앱 없이 쓰기: 학생 · 학부모 앱을 안 쓰고 원장님만 명단 · 출결 · 수강료를 관리하는 학원
alter table public.academies add column if not exists app_off boolean not null default false;
grant update (app_off) on public.academies to authenticated;

-- 4) 시간표: 보강(그 주에만 있는 추가 수업) · 휴강(그 주만 쉬는 수업 + 이유)
alter table public.timetable add column if not exists kind text not null default 'regular' check (kind in ('regular', 'makeup'));
alter table public.timetable add column if not exists cancels jsonb not null default '{}'::jsonb; -- { "그 주 월요일": "휴강 이유" }
grant insert (kind, cancels) on public.timetable to authenticated;
grant update (kind, cancels) on public.timetable to authenticated;

drop function if exists public.family_timetable(uuid);
create function public.family_timetable(p_academy uuid)
returns table(id uuid, class_name text, weekday smallint, start_time time, end_time time, subject text, color text, week_of date, skip_weeks date[], kind text, cancels jsonb)
language sql stable security definer set search_path = '' as $$
  select t.id, t.class_name, t.weekday, t.start_time, t.end_time, t.subject, t.color, t.week_of, t.skip_weeks, t.kind, t.cancels
  from public.timetable t
  where t.academy_id = p_academy and private.academy_role(p_academy) in ('parent', 'student')
  order by t.weekday, t.start_time;
$$;
revoke all on function public.family_timetable(uuid) from public, anon;
grant execute on function public.family_timetable(uuid) to authenticated;

-- 5) 휴강은 QR 지각 판단에서도 빼요 (cancels에 그 주가 있으면 수업 없음)
create or replace function private.tt_on(t public.timetable, d date)
returns boolean language sql stable set search_path = '' as $$
  select t.weekday = extract(dow from d)::int
    and not (coalesce(t.cancels, '{}'::jsonb) ? to_char(date_trunc('week', d)::date, 'YYYY-MM-DD'))
    and case when t.week_of is not null then t.week_of = date_trunc('week', d)::date
             else not (date_trunc('week', d)::date = any(t.skip_weeks)) end;
$$;

-- 6) 바뀐 기록: 휴강 · 휴강 풀림(이유) · 보강 날짜
create or replace function private.schedule_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; v_sum text; v_old text; v_role text; v_action text;
  days text[] := array['일', '월', '화', '수', '목', '금', '토'];
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if (select auth.uid()) is null or not exists (select 1 from public.academies where id = r.academy_id) then return null; end if;
  v_action := case tg_op when 'INSERT' then 'add' when 'UPDATE' then 'edit' else 'delete' end;
  if tg_table_name = 'timetable' then
    v_sum := format('%s · %s요일 %s~%s%s%s', r.class_name, days[r.weekday + 1], to_char(r.start_time, 'HH24:MI'), to_char(r.end_time, 'HH24:MI'),
      case when coalesce(r.subject, '') <> '' then ' · ' || r.subject else '' end,
      case when r.kind = 'makeup' then format(' · %s 보강', to_char(r.week_of + ((r.weekday + 6) % 7), 'FMMM/FMDD')) when r.week_of is not null then format(' · %s 주만', to_char(r.week_of, 'FMMM/FMDD')) else '' end);
    if tg_op = 'UPDATE' then
      v_old := format('%s · %s요일 %s~%s%s%s', old.class_name, days[old.weekday + 1], to_char(old.start_time, 'HH24:MI'), to_char(old.end_time, 'HH24:MI'),
        case when coalesce(old.subject, '') <> '' then ' · ' || old.subject else '' end,
        case when old.kind = 'makeup' then format(' · %s 보강', to_char(old.week_of + ((old.weekday + 6) % 7), 'FMMM/FMDD')) when old.week_of is not null then format(' · %s 주만', to_char(old.week_of, 'FMMM/FMDD')) else '' end);
      -- 이 주만 빼기: 다른 칸은 그대로고 빠지는 주만 늘었어요
      if v_old = v_sum and coalesce(new.cancels, '{}') is distinct from coalesce(old.cancels, '{}') then
        -- 휴강으로 바꿈 / 휴강 풀림 (이유와 함께)
        v_sum := v_sum || coalesce((select ' · ' || string_agg(to_char(k::date, 'FMMM/FMDD') || ' 주 휴강' || case when coalesce(new.cancels ->> k, '') <> '' then '(' || (new.cancels ->> k) || ')' else '' end, ', ')
          from jsonb_object_keys(coalesce(new.cancels, '{}')) k where not (coalesce(old.cancels, '{}') ? k)), '')
          || coalesce((select ' · ' || string_agg(to_char(k::date, 'FMMM/FMDD') || ' 주 휴강 풀림', ', ')
          from jsonb_object_keys(coalesce(old.cancels, '{}')) k where not (coalesce(new.cancels, '{}') ? k)), '');
        v_action := 'skip';
      elsif v_old = v_sum and coalesce(new.skip_weeks, '{}') is distinct from coalesce(old.skip_weeks, '{}') then
        v_sum := v_sum || coalesce(format(' · %s 주 뺌', (select string_agg(to_char(w, 'FMMM/FMDD'), ', ')
          from unnest(new.skip_weeks) w where not (w = any (coalesce(old.skip_weeks, '{}'))))), ' · 빠진 주 되돌림');
        v_action := 'skip';
      elsif v_old <> v_sum then
        v_sum := v_old || ' → ' || v_sum;
      else
        -- 시간 · 요일은 그대로고 다른 칸만 바뀌었으면 무엇이 바뀌었는지
        v_sum := v_sum || coalesce(' · ' || nullif(concat_ws(' · ',
          case when new.room is distinct from old.room then '강의실 ' || coalesce(new.room, '비움') end,
          case when new.teacher_name is distinct from old.teacher_name then '담당 ' || coalesce(new.teacher_name, '비움') end,
          case when new.note is distinct from old.note then '메모 바뀜' end,
          case when new.color is distinct from old.color then '색 바뀜' end), ''), '');
      end if;
    end if;
  else
    v_sum := format('%s · %s', to_char(r.day, 'MM/DD'), r.title);
    if tg_op = 'UPDATE' then
      v_old := format('%s · %s', to_char(old.day, 'MM/DD'), old.title);
      if v_old <> v_sum then v_sum := v_old || ' → ' || v_sum; end if;
    end if;
  end if;
  v_role := private.academy_role(r.academy_id);
  insert into public.schedule_logs (academy_id, kind, action, summary, who, who_name, who_role)
  values (r.academy_id, case when tg_table_name = 'timetable' then 'timetable' else 'event' end,
    v_action, left(v_sum, 300), (select auth.uid()), private.who_label(), v_role);
  return null;
end $$;

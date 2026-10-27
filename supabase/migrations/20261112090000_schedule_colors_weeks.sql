-- 10라운드: 일정 · 시간표 색 · 주마다 다른 시간표 · 과목 목록 · 학원 사람 수
-- 1) 색 (10가지 이름: blue sky teal green lime yellow orange red pink purple)
alter table public.timetable add column if not exists color text check (color is null or color in ('blue','sky','teal','green','lime','yellow','orange','red','pink','purple'));
alter table public.academy_events add column if not exists color text check (color is null or color in ('blue','sky','teal','green','lime','yellow','orange','red','pink','purple'));

-- 2) 주마다 다른 시간표: week_of(그 주 월요일)가 있으면 그 주에만, 없으면 매주. skip_weeks는 매주 수업 중 빠지는 주(월요일)
alter table public.timetable add column if not exists week_of date check (week_of is null or extract(isodow from week_of) = 1);
alter table public.timetable add column if not exists skip_weeks date[] not null default '{}';

-- 그 날 실제로 있는 수업인지
create or replace function private.tt_on(t public.timetable, d date) returns boolean language sql stable set search_path = ''
as $$ select t.weekday = extract(dow from d)::int
  and case when t.week_of is not null then t.week_of = date_trunc('week', d)::date
           else not (date_trunc('week', d)::date = any(t.skip_weeks)) end; $$;

-- QR 출석 지각 판단도 그 주 시간표로
create or replace function private.do_checkin(p_student uuid, p_method text, p_by uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare s record; v_day date := (now() at time zone 'Asia/Seoul')::date; v_now time := (now() at time zone 'Asia/Seoul')::time;
  v_start time; v_status text; v_old record;
begin
  select id, academy_id, name, class_name into s from public.students where id = p_student and coalesce(status, 'active') = 'active';
  if s.id is null then return null; end if;
  select status, checked_at into v_old from public.attendance where student_id = s.id and day = v_day;
  if v_old.status is not null then
    return jsonb_build_object('student_id', s.id, 'name', s.name, 'status', v_old.status, 'already', true, 'at', v_old.checked_at);
  end if;
  select t.start_time into v_start from public.timetable t
    where t.academy_id = s.academy_id and t.class_name = s.class_name and private.tt_on(t, v_day) and t.end_time > v_now
    order by t.start_time limit 1;
  v_status := case when v_start is not null and v_now > v_start + interval '10 minutes' then 'late' else 'present' end;
  insert into public.attendance (academy_id, student_id, day, status, checked_by, method, checked_at)
    values (s.academy_id, s.id, v_day, v_status, p_by, p_method, now())
    on conflict (student_id, day) do nothing;
  return jsonb_build_object('student_id', s.id, 'name', s.name, 'status', v_status, 'already', false, 'at', now());
end $$;

-- 가족 시간표 · 일정에도 색 · 주 정보
drop function if exists public.family_timetable(uuid);
create function public.family_timetable(p_academy uuid)
returns table(id uuid, class_name text, weekday smallint, start_time time, end_time time, subject text, color text, week_of date, skip_weeks date[])
language sql stable security definer set search_path = ''
as $$
  select t.id, t.class_name, t.weekday, t.start_time, t.end_time, t.subject, t.color, t.week_of, t.skip_weeks
  from public.timetable t
  where t.academy_id = p_academy and private.academy_role(p_academy) in ('parent', 'student')
  order by t.weekday, t.start_time;
$$;
drop function if exists public.family_events(uuid, date, date);
create function public.family_events(p_academy uuid, p_from date, p_to date)
returns table(id uuid, day date, end_day date, start_time time, end_time time, kind text, title text, target_class text, color text)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.day, e.end_day, e.start_time, e.end_time, e.kind, e.title, e.target_class, e.color
  from public.academy_events e
  where e.academy_id = p_academy and private.academy_role(p_academy) in ('parent', 'student')
    and e.day <= p_to and coalesce(e.end_day, e.day) >= p_from
  order by e.day, e.start_time nulls first;
$$;
grant execute on function public.family_timetable(uuid) to authenticated;
grant execute on function public.family_events(uuid, date, date) to authenticated;

-- 3) 우리 학원 과목 목록 (시간표 과목 칸에서 눌러 고르기, 원장 · 강사가 고쳐요)
alter table public.academies add column if not exists subjects text[];
create or replace function public.set_academy_subjects(p_academy uuid, p_subjects text[])
returns text[] language plpgsql security definer set search_path = ''
as $$
declare v text[];
begin
  if coalesce(private.academy_role(p_academy), '') not in ('owner', 'teacher') then raise exception 'not_allowed'; end if;
  select coalesce(array_agg(s order by o), '{}') into v from (
    select distinct on (lower(trim(x))) left(trim(x), 30) s, o from unnest(p_subjects) with ordinality u(x, o)
    where nullif(trim(x), '') is not null order by lower(trim(x)), o) q;
  update public.academies set subjects = v[1:40] where id = p_academy;
  return v[1:40];
end $$;
grant execute on function public.set_academy_subjects(uuid, text[]) to authenticated;

-- 4) 우리 학원 사람 수 (학원에 속한 누구나 봐요)
create or replace function public.academy_people_counts(p_academy uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case when private.academy_role(p_academy) is null then null else jsonb_build_object(
    'owner', (select count(*) from public.academy_members where academy_id = p_academy and role = 'owner'),
    'teacher', (select count(*) from public.academy_members where academy_id = p_academy and role = 'teacher'),
    'parent', (select count(*) from public.academy_members where academy_id = p_academy and role = 'parent'),
    'student', (select count(*) from public.academy_members where academy_id = p_academy and role = 'student'),
    'enrolled', (select count(*) from public.students where academy_id = p_academy and coalesce(status, 'active') = 'active')
  ) end;
$$;
grant execute on function public.academy_people_counts(uuid) to authenticated;

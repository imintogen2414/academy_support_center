-- 12단계: 학원 일정 · 시간표
-- 원장 · 강사 · 학부모 · 학생 모두 같은 일정과 시간표를 봐요. 세부 사항(메모 · 강의실 · 담당 강사)은 원장 · 강사만.
-- 표는 원장 · 강사만 바로 읽고, 학부모 · 학생은 세부 사항을 뺀 RPC로 읽어요.

/* ---------- 주간 시간표 (원장이 정해요) ---------- */
create table public.timetable (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  class_name text not null check (char_length(class_name) between 1 and 50),
  weekday smallint not null check (weekday between 0 and 6), -- 0 = 일요일
  start_time time not null,
  end_time time not null,
  subject text check (char_length(subject) <= 50),
  room text check (char_length(room) <= 30),          -- 세부
  teacher_name text check (char_length(teacher_name) <= 50), -- 세부
  note text check (char_length(note) <= 300),         -- 세부
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index timetable_academy_idx on public.timetable (academy_id, weekday);
comment on table public.timetable is '주간 시간표 (원장 쓰기, 원장·강사 읽기, 가족은 family_timetable)';

alter table public.timetable enable row level security;
create policy "원장·강사가 시간표를 볼 수 있음" on public.timetable for select to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장이 시간표를 넣음" on public.timetable for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "원장이 시간표를 고침" on public.timetable for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "원장이 시간표를 지움" on public.timetable for delete to authenticated
  using (private.academy_role(academy_id) = 'owner');
revoke all on public.timetable from anon, authenticated;
grant select, delete on public.timetable to authenticated;
grant insert (academy_id, class_name, weekday, start_time, end_time, subject, room, teacher_name, note) on public.timetable to authenticated;
grant update (class_name, weekday, start_time, end_time, subject, room, teacher_name, note) on public.timetable to authenticated;

/* ---------- 학원 일정 (시험 · 행사 · 휴원 …, 원장 · 강사가 넣어요) ---------- */
create table public.academy_events (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  day date not null,
  end_day date,
  start_time time,
  end_time time,
  kind text not null default '행사' check (kind in ('수업', '시험', '행사', '휴원', '상담', '설명회', '기타')),
  title text not null check (char_length(title) between 1 and 100),
  target_class text check (char_length(target_class) <= 50), -- 비면 전체
  detail text check (char_length(detail) <= 1000),             -- 세부
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (end_day is null or end_day >= day)
);
create index academy_events_academy_day_idx on public.academy_events (academy_id, day);
comment on table public.academy_events is '학원 일정 (원장·강사 쓰기·읽기, 가족은 family_events)';

alter table public.academy_events enable row level security;
create policy "원장·강사가 일정을 볼 수 있음" on public.academy_events for select to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장·강사가 일정을 넣음" on public.academy_events for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "일정 고침: 원장 전부, 강사 내 것" on public.academy_events for update to authenticated
  using (private.academy_role(academy_id) = 'owner' or (private.academy_role(academy_id) = 'teacher' and created_by = (select auth.uid())))
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "일정 지움: 원장 전부, 강사 내 것" on public.academy_events for delete to authenticated
  using (private.academy_role(academy_id) = 'owner' or (private.academy_role(academy_id) = 'teacher' and created_by = (select auth.uid())));
revoke all on public.academy_events from anon, authenticated;
grant select, delete on public.academy_events to authenticated;
grant insert (academy_id, day, end_day, start_time, end_time, kind, title, target_class, detail) on public.academy_events to authenticated;
grant update (day, end_day, start_time, end_time, kind, title, target_class, detail) on public.academy_events to authenticated;

/* ---------- 학부모 · 학생: 세부 사항을 뺀 시간표 · 일정 ---------- */
create function public.family_timetable(p_academy uuid)
returns table (id uuid, class_name text, weekday smallint, start_time time, end_time time, subject text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.class_name, t.weekday, t.start_time, t.end_time, t.subject
  from public.timetable t
  where t.academy_id = p_academy and private.academy_role(p_academy) in ('parent', 'student')
  order by t.weekday, t.start_time;
$$;

create function public.family_events(p_academy uuid, p_from date, p_to date)
returns table (id uuid, day date, end_day date, start_time time, end_time time, kind text, title text, target_class text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.day, e.end_day, e.start_time, e.end_time, e.kind, e.title, e.target_class
  from public.academy_events e
  where e.academy_id = p_academy and private.academy_role(p_academy) in ('parent', 'student')
    and e.day <= p_to and coalesce(e.end_day, e.day) >= p_from
  order by e.day, e.start_time nulls first;
$$;

revoke execute on function public.family_timetable(uuid), public.family_events(uuid, date, date) from public, anon;
grant execute on function public.family_timetable(uuid), public.family_events(uuid, date, date) to authenticated;

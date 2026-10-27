-- 직책 · 권한: 원장이 강사(매니저 · 재정 담당 …)마다 원장만 쓰던 기능을 켜고 꺼요.
-- 시간표 · 일정은 원장 · 강사가 똑같이 고치고, 누가 고쳤는지 남겨요.

-- 1) 학원 사람마다 직책 이름 · 켜 둔 권한
alter table public.academy_members add column if not exists title text;
alter table public.academy_members add column if not exists perms text[] not null default '{}';

-- 직책(예: 매니저 · 재정 담당 · 상담 실장)마다 기본 권한
create table if not exists public.academy_titles (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  perms text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (academy_id, name)
);
alter table public.academy_titles enable row level security;
create policy "원장·강사가 직책을 봐요" on public.academy_titles for select to authenticated
  using (private.academy_role(academy_id) = any (array['owner', 'teacher']));

-- 켤 수 있는 권한
create or replace function private.perm_keys() returns text[]
language sql immutable set search_path = '' as $$
  select array['students', 'notices', 'invite', 'billing', 'finance', 'paper', 'payroll', 'approvals', 'hire', 'staff'] $$;

-- 원장이거나, 그 권한이 켜진 강사면 true
create or replace function private.can_do(aid uuid, perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.academy_members m
    where m.academy_id = aid and m.user_id = (select auth.uid())
      and (m.role = 'owner' or (m.role = 'teacher' and perm = any (m.perms)))) $$;

create or replace function private.clean_perms(p text[]) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct x order by x), '{}') from unnest(coalesce(p, '{}')) x where x = any (private.perm_keys()) $$;

-- 2) 원장만 쓰던 정책을 "원장 또는 권한이 켜진 강사"로
do $$
declare
  map jsonb := '{"invoices":"billing","tuition_plans":"billing","discount_presets":"billing",
    "expenses":"finance","incomes":"finance","paperwork":"paper","payroll":"payroll",
    "notices":"notices","approvals":"approvals","job_posts":"hire",
    "students":"students","attendance":"students","growth_reports":"students","student_todos":"students",
    "student_links":"students","leads":"students"}';
  r record; q text; c text; o text := $o$(private.academy_role(academy_id) = 'owner'::text)$o$;
begin
  for r in select * from pg_policies where schemaname = 'public' and map ? tablename loop
    q := replace(r.qual, o, format('private.can_do(academy_id, %L)', map ->> r.tablename));
    c := replace(r.with_check, o, format('private.can_do(academy_id, %L)', map ->> r.tablename));
    if q is distinct from r.qual or c is distinct from r.with_check then
      execute format('alter policy %I on public.%I %s %s', r.policyname, r.tablename,
        case when r.qual is not null then format('using (%s)', q) else '' end,
        case when r.with_check is not null then format('with check (%s)', c) else '' end);
    end if;
  end loop;
end $$;

-- 모든 원생 권한이면 담당 반이 아니어도 봐요
create or replace function private.can_see_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s
    where s.id = p_student and (
      private.can_do(s.academy_id, 'students')
      or (private.academy_role(s.academy_id) = 'teacher'
          and (s.added_by = (select auth.uid()) or s.class_name = any (private.my_classes(s.academy_id))))
    ));
$$;

create or replace function private.is_job_owner(jid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select private.can_do(academy_id, 'hire') from public.job_posts where id = jid), false) $$;

-- 3) RPC도 같은 기준으로
create or replace function public.decide_approval(p_id uuid, p_ok boolean, p_comment text, p_category text)
returns void language plpgsql security definer set search_path = '' as $$
declare a record; eid uuid;
begin
  select * into a from public.approvals where id = p_id for update;
  if not found or not private.can_do(a.academy_id, 'approvals') then raise exception 'owner_only'; end if;
  -- 내가 올린 결재는 내가 처리하지 않아요 (원장은 예외)
  if a.requested_by = (select auth.uid()) and private.academy_role(a.academy_id) <> 'owner' then raise exception 'own_request'; end if;
  if a.status <> 'pending' then raise exception 'not_pending'; end if;
  if p_ok and nullif(trim(coalesce(p_category, '')), '') is not null and coalesce(a.amount, 0) > 0
     and private.can_do(a.academy_id, 'finance') then
    insert into public.expenses (academy_id, day, category, amount, memo)
      values (a.academy_id, current_date, left(trim(p_category), 20), a.amount,
              left(format('결재: %s (%s)', a.title, coalesce(a.requester_name, '강사')), 200))
      returning id into eid;
  end if;
  update public.approvals
    set status = case when p_ok then 'approved' else 'rejected' end,
        owner_comment = nullif(left(trim(coalesce(p_comment, '')), 500), ''),
        decided_by = (select auth.uid()), decided_at = now(), expense_id = eid
    where id = p_id;
end $$;

-- 초대 코드: 권한이 있는 강사는 원장용 코드는 못 봐요
create or replace function public.get_invite_codes(p_academy uuid)
returns table(kind text, code text) language sql stable security definer set search_path = '' as $$
  select kind, code from public.academy_codes
  where academy_id = p_academy and private.can_do(p_academy, 'invite')
    and (kind <> 'owner' or private.academy_role(p_academy) = 'owner')
  order by array_position(array['owner', 'teacher', 'family'], kind);
$$;

create or replace function public.link_family(p_student uuid, p_user uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare aid uuid := (select academy_id from public.students where id = p_student);
begin
  if aid is null or not private.can_do(aid, 'students') then raise exception 'not_allowed'; end if;
  if p_on then
    if not exists (select 1 from public.academy_members where academy_id = aid and user_id = p_user and role in ('parent', 'student')) then
      raise exception 'not_family';
    end if;
    insert into public.student_links (student_id, user_id, academy_id) values (p_student, p_user, aid) on conflict do nothing;
  else
    delete from public.student_links where student_id = p_student and user_id = p_user;
  end if;
end $$;

create or replace function public.list_family_members(p_academy uuid)
returns table(user_id uuid, name text, role text, joined_at timestamptz, students uuid[])
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(p.name, p.username, '이름 없음'), m.role, m.created_at,
    coalesce(array_agg(l.student_id) filter (where l.student_id is not null), '{}')
  from public.academy_members m
  left join public.profiles p on p.id = m.user_id
  left join public.student_links l on l.user_id = m.user_id and l.academy_id = m.academy_id
  where m.academy_id = p_academy and m.role in ('parent', 'student') and private.can_do(p_academy, 'students')
  group by m.user_id, p.name, p.username, m.role, m.created_at
  order by m.role, m.created_at;
$$;

-- 함께하는 사람 목록에 직책도
drop function if exists public.list_academy_members(uuid);
create function public.list_academy_members(p_academy uuid)
returns table(name text, role text, joined_at timestamptz, title text)
language sql stable security definer set search_path = '' as $$
  select coalesce(p.name, p.username, '이름 없음'), m.role, m.created_at, m.title
  from public.academy_members m
  left join public.profiles p on p.id = m.user_id
  where m.academy_id = p_academy and (private.can_do(p_academy, 'invite') or private.can_do(p_academy, 'staff'))
  order by array_position(array['owner', 'teacher', 'parent', 'student'], m.role), m.created_at;
$$;
revoke all on function public.list_academy_members(uuid) from public, anon;
grant execute on function public.list_academy_members(uuid) to authenticated;

create or replace function public.list_teacher_classes(p_academy uuid)
returns table(user_id uuid, name text, classes text[], timetable_classes text[])
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(p.name, p.username, '이름 없음'), m.classes,
    coalesce((select array_agg(distinct t.class_name) from public.timetable t
      where t.academy_id = p_academy and t.teacher_name = coalesce(p.name, p.username)), '{}')
  from public.academy_members m left join public.profiles p on p.id = m.user_id
  where m.academy_id = p_academy and m.role = 'teacher' and private.can_do(p_academy, 'staff')
  order by m.created_at;
$$;

create or replace function public.set_teacher_classes(p_academy uuid, p_user uuid, p_classes text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_do(p_academy, 'staff') then raise exception 'not_allowed'; end if;
  update public.academy_members
    set classes = coalesce((select array_agg(distinct left(trim(c), 50)) from unnest(p_classes) c where nullif(trim(c), '') is not null), '{}')
    where academy_id = p_academy and user_id = p_user and role = 'teacher';
  if not found then raise exception 'not_teacher'; end if;
end $$;

create or replace function public.academy_training_report(p_academy uuid)
returns table(teacher_id uuid, teacher_name text, joined_at timestamptz, video_id uuid, body text, done_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(p.name, p.username, '이름 없음'), m.created_at, r.video_id, r.body, r.created_at
  from public.academy_members m
  left join public.profiles p on p.id = m.user_id
  left join public.training_reflections r on r.user_id = m.user_id
  where m.academy_id = p_academy and m.role = 'teacher' and private.can_do(p_academy, 'staff')
  order by m.created_at, r.created_at;
$$;

create or replace function public.notice_report(p_academy uuid)
returns table(notice_id uuid, total integer, read integer)
language sql stable security definer set search_path = '' as $$
  select n.id,
    (select count(*) from private.notice_audience(n.id))::int,
    (select count(*) from private.notice_audience(n.id) a join public.notice_reads r on r.notice_id = n.id and r.user_id = a.user_id)::int
  from public.notices n
  where n.academy_id = p_academy and private.can_do(p_academy, 'notices');
$$;

create or replace function public.notice_readers(p_notice uuid)
returns table(name text, role text, read_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select coalesce(p.name, p.username, '이름 없음'), m.role, r.read_at
  from private.notice_audience(p_notice) a
  join public.notices n on n.id = p_notice
  join public.academy_members m on m.academy_id = n.academy_id and m.user_id = a.user_id
  left join public.profiles p on p.id = a.user_id
  left join public.notice_reads r on r.notice_id = p_notice and r.user_id = a.user_id
  where private.can_do(n.academy_id, 'notices')
  order by r.read_at nulls first, p.name;
$$;

create or replace function public.list_job_applicants(p_academy uuid)
returns table(job_id uuid, user_id uuid, name text, career text, phone text, message text, status text, applied_at timestamptz, trainings_done integer, profile jsonb)
language sql stable security definer set search_path = '' as $$
  select a.job_id, a.user_id, coalesce(pr.name, pr.username, '이름 없음'), a.career, a.phone, a.message, a.status, a.created_at,
         (select count(*)::integer from public.training_reflections r where r.user_id = a.user_id),
         (select to_jsonb(t) - 'user_id' - 'open_to_offers' from public.teacher_profiles t where t.user_id = a.user_id)
  from public.job_applications a
  join public.job_posts j on j.id = a.job_id
  left join public.profiles pr on pr.id = a.user_id
  where j.academy_id = p_academy and private.can_do(p_academy, 'hire')
  order by a.created_at desc;
$$;

-- 4) 원장이 직책 · 권한을 정하는 RPC
create or replace function public.list_staff_perms(p_academy uuid)
returns table(user_id uuid, name text, role text, title text, perms text[], joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(p.name, p.username, '이름 없음'), m.role, m.title, m.perms, m.created_at
  from public.academy_members m left join public.profiles p on p.id = m.user_id
  where m.academy_id = p_academy and m.role in ('owner', 'teacher') and private.academy_role(p_academy) = 'owner'
  order by array_position(array['owner', 'teacher'], m.role), m.created_at;
$$;

create or replace function public.set_member_perms(p_academy uuid, p_user uuid, p_title text, p_perms text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.academy_role(p_academy) is distinct from 'owner' then raise exception 'owner_only'; end if;
  update public.academy_members
    set title = nullif(left(trim(coalesce(p_title, '')), 20), ''), perms = private.clean_perms(p_perms)
    where academy_id = p_academy and user_id = p_user and role = 'teacher';
  if not found then raise exception 'not_teacher'; end if;
end $$;

-- 직책 만들기 · 고치기: 그 직책인 사람들의 권한도 함께 바뀌어요
create or replace function public.save_academy_title(p_academy uuid, p_id uuid, p_name text, p_perms text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_old text; v_name text := left(trim(coalesce(p_name, '')), 20); v_perms text[] := private.clean_perms(p_perms);
begin
  if private.academy_role(p_academy) is distinct from 'owner' then raise exception 'owner_only'; end if;
  if v_name = '' then raise exception 'name_required'; end if;
  if v_name in ('원장', '강사') then raise exception 'reserved_title'; end if;
  if p_id is null then
    insert into public.academy_titles (academy_id, name, perms) values (p_academy, v_name, v_perms) returning id into v_id;
  else
    select name into v_old from public.academy_titles where id = p_id and academy_id = p_academy;
    if v_old is null then raise exception 'not_found'; end if;
    update public.academy_titles set name = v_name, perms = v_perms where id = p_id returning id into v_id;
    update public.academy_members set title = v_name, perms = v_perms
      where academy_id = p_academy and role = 'teacher' and title = v_old;
  end if;
  return v_id;
exception when unique_violation then raise exception 'title_taken';
end $$;

create or replace function public.delete_academy_title(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  select * into t from public.academy_titles where id = p_id;
  if t.id is null or private.academy_role(t.academy_id) is distinct from 'owner' then raise exception 'owner_only'; end if;
  -- 그 직책이던 사람은 "강사"로, 켜 둔 권한은 그대로
  update public.academy_members set title = null where academy_id = t.academy_id and title = t.name;
  delete from public.academy_titles where id = p_id;
end $$;

revoke all on function public.list_staff_perms(uuid) from public, anon;
revoke all on function public.set_member_perms(uuid, uuid, text, text[]) from public, anon;
revoke all on function public.save_academy_title(uuid, uuid, text, text[]) from public, anon;
revoke all on function public.delete_academy_title(uuid) from public, anon;
grant execute on function public.list_staff_perms(uuid) to authenticated;
grant execute on function public.set_member_perms(uuid, uuid, text, text[]) to authenticated;
grant execute on function public.save_academy_title(uuid, uuid, text, text[]) to authenticated;
grant execute on function public.delete_academy_title(uuid) to authenticated;

-- 5) 시간표 · 일정: 원장 · 강사가 똑같이 넣고 고치고 지워요
drop policy if exists "원장이 시간표를 고침" on public.timetable;
drop policy if exists "원장이 시간표를 넣음" on public.timetable;
drop policy if exists "원장이 시간표를 지움" on public.timetable;
create policy "원장·강사가 시간표를 넣음" on public.timetable for insert to authenticated
  with check (private.academy_role(academy_id) = any (array['owner', 'teacher']));
create policy "원장·강사가 시간표를 고침" on public.timetable for update to authenticated
  using (private.academy_role(academy_id) = any (array['owner', 'teacher']))
  with check (private.academy_role(academy_id) = any (array['owner', 'teacher']));
create policy "원장·강사가 시간표를 지움" on public.timetable for delete to authenticated
  using (private.academy_role(academy_id) = any (array['owner', 'teacher']));

drop policy if exists "일정 고침: 원장 전부, 강사 내 것" on public.academy_events;
drop policy if exists "일정 지움: 원장 전부, 강사 내 것" on public.academy_events;
create policy "원장·강사가 일정을 고침" on public.academy_events for update to authenticated
  using (private.academy_role(academy_id) = any (array['owner', 'teacher']))
  with check (private.academy_role(academy_id) = any (array['owner', 'teacher']));
create policy "원장·강사가 일정을 지움" on public.academy_events for delete to authenticated
  using (private.academy_role(academy_id) = any (array['owner', 'teacher']));

-- 누가 마지막으로 고쳤는지
alter table public.timetable add column if not exists created_by uuid;
alter table public.timetable add column if not exists created_by_name text;
alter table public.timetable add column if not exists updated_by_name text;
alter table public.timetable add column if not exists updated_at timestamptz;
alter table public.academy_events add column if not exists created_by_name text;
alter table public.academy_events add column if not exists updated_by_name text;
alter table public.academy_events add column if not exists updated_at timestamptz;

-- 바뀐 기록 (원장 · 강사만 봐요)
create table if not exists public.schedule_logs (
  id bigint generated always as identity primary key,
  academy_id uuid not null references public.academies(id) on delete cascade,
  kind text not null check (kind in ('timetable', 'event')),
  action text not null check (action in ('add', 'edit', 'delete')),
  summary text not null,
  who uuid,
  who_name text,
  who_role text,
  created_at timestamptz not null default now()
);
create index if not exists schedule_logs_acad on public.schedule_logs (academy_id, created_at desc);
alter table public.schedule_logs enable row level security;
create policy "원장·강사가 바뀐 기록을 봐요" on public.schedule_logs for select to authenticated
  using (private.academy_role(academy_id) = any (array['owner', 'teacher']));

create or replace function private.who_label() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(p.name, p.username, '이름 없음') from public.profiles p where p.id = (select auth.uid()) $$;

create or replace function private.schedule_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, (select auth.uid()));
    new.created_by_name := private.who_label();
  else
    new.created_by := old.created_by; new.created_by_name := old.created_by_name;
    new.updated_by_name := private.who_label(); new.updated_at := now();
  end if;
  return new;
end $$;

create or replace function private.schedule_log() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record; v_sum text; v_role text;
  days text[] := array['일', '월', '화', '수', '목', '금', '토'];
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if (select auth.uid()) is null or not exists (select 1 from public.academies where id = r.academy_id) then return null; end if;
  if tg_table_name = 'timetable' then
    v_sum := format('%s · %s요일 %s~%s%s', r.class_name, days[r.weekday + 1], to_char(r.start_time, 'HH24:MI'), to_char(r.end_time, 'HH24:MI'),
      case when coalesce(r.subject, '') <> '' then ' · ' || r.subject else '' end);
  else
    v_sum := format('%s · %s', to_char(r.day, 'MM/DD'), r.title);
  end if;
  v_role := private.academy_role(r.academy_id);
  insert into public.schedule_logs (academy_id, kind, action, summary, who, who_name, who_role)
  values (r.academy_id, case when tg_table_name = 'timetable' then 'timetable' else 'event' end,
    case tg_op when 'INSERT' then 'add' when 'UPDATE' then 'edit' else 'delete' end,
    left(v_sum, 200), (select auth.uid()), private.who_label(), v_role);
  return null;
end $$;

drop trigger if exists timetable_stamp on public.timetable;
create trigger timetable_stamp before insert or update on public.timetable for each row execute function private.schedule_stamp();
drop trigger if exists events_stamp on public.academy_events;
create trigger events_stamp before insert or update on public.academy_events for each row execute function private.schedule_stamp();
drop trigger if exists timetable_log on public.timetable;
create trigger timetable_log after insert or update or delete on public.timetable for each row execute function private.schedule_log();
drop trigger if exists events_log on public.academy_events;
create trigger events_log after insert or update or delete on public.academy_events for each row execute function private.schedule_log();

-- 예전 일정은 만든 사람 이름을 채워 둬요
update public.academy_events e set created_by_name = coalesce(p.name, p.username)
  from public.profiles p where p.id = e.created_by and e.created_by_name is null;

-- 재정 권한만 있어도 매출(납부 확인한 청구)은 읽어요
alter policy "원장만 청구를 볼 수 있음" on public.invoices
  using (private.can_do(academy_id, 'billing') or private.can_do(academy_id, 'finance'));

-- 강사 권한 다듬기
-- 1) 강사는 담당 반 학생만 봐요: 원장이 정한 담당 반(academy_members.classes) + 시간표에서 담당 강사가 나인 반 + 내가 추가한 학생
--    원생 · 출결 · 할 일 · 성장 리포트가 같은 기준이에요.
-- 2) 강사가 올린 홍보 의뢰는 원장 결재(owner_review)를 거쳐야 센터로 넘어가요.

/* ---------- 1) 담당 반 ---------- */
alter table public.academy_members add column classes text[] not null default '{}';

-- 지금 로그인한 강사의 담당 반 (원장이 정한 반 + 시간표 담당)
create function private.my_classes(p_academy uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct c), '{}') from (
    select unnest(m.classes) as c from public.academy_members m
      where m.academy_id = p_academy and m.user_id = (select auth.uid())
    union
    select t.class_name from public.timetable t
      where t.academy_id = p_academy and t.teacher_name is not null
        and t.teacher_name = (select coalesce(p.name, p.username) from public.profiles p where p.id = (select auth.uid()))
  ) x where c is not null;
$$;
revoke execute on function private.my_classes(uuid) from public, anon;
grant execute on function private.my_classes(uuid) to authenticated;

-- 이 학생을 볼 수 있나: 원장은 전부, 강사는 담당 반이거나 내가 추가한 학생
create function private.can_see_student(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.students s
    where s.id = p_student and (
      private.academy_role(s.academy_id) = 'owner'
      or (private.academy_role(s.academy_id) = 'teacher'
          and (s.added_by = (select auth.uid()) or s.class_name = any (private.my_classes(s.academy_id))))
    ));
$$;
revoke execute on function private.can_see_student(uuid) from public, anon;
grant execute on function private.can_see_student(uuid) to authenticated;

alter policy "원장·강사는 원생을 볼 수 있음" on public.students
  using (private.academy_role(academy_id) = 'owner'
    or (private.academy_role(academy_id) = 'teacher' and (added_by = (select auth.uid()) or class_name = any (private.my_classes(academy_id)))));
alter policy "원장·강사가 원생을 고침" on public.students
  using (private.academy_role(academy_id) = 'owner'
    or (private.academy_role(academy_id) = 'teacher' and (added_by = (select auth.uid()) or class_name = any (private.my_classes(academy_id)))))
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
alter policy "원장·강사는 출결을 볼 수 있음" on public.attendance
  using (private.academy_role(academy_id) = 'owner' or (private.academy_role(academy_id) = 'teacher' and private.can_see_student(student_id)));
alter policy "학원 사람과 연결된 가족이 볼 수 있음" on public.student_todos
  using (private.academy_role(academy_id) = 'owner' or (private.academy_role(academy_id) = 'teacher' and private.can_see_student(student_id)) or private.is_my_child(student_id));
alter policy "원장·강사·학부모·학생이 할 일을 넣음" on public.student_todos
  with check (private.academy_role(academy_id) = 'owner' or (private.academy_role(academy_id) = 'teacher' and private.can_see_student(student_id))
    or (private.academy_role(academy_id) in ('parent', 'student') and private.is_my_child(student_id)));
alter policy "학원 사람은 전부, 가족은 발급된 우리 아이 것" on public.growth_reports
  using (private.academy_role(academy_id) = 'owner' or (private.academy_role(academy_id) = 'teacher' and private.can_see_student(student_id))
    or (status = 'issued' and private.is_my_child(student_id)));
alter policy "원장·강사가 리포트를 고침" on public.growth_reports
  using (private.academy_role(academy_id) = 'owner' or (private.academy_role(academy_id) = 'teacher' and private.can_see_student(student_id)))
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
alter policy "원장·강사가 리포트를 씀" on public.growth_reports
  with check (private.academy_role(academy_id) = 'owner' or (private.academy_role(academy_id) = 'teacher' and private.can_see_student(student_id)));

-- 출결 넣기 · 할 일 체크도 같은 기준
create or replace function public.mark_attendance(p_students uuid[], p_day date, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  if p_status is not null and p_status not in ('present', 'late', 'absent', 'early') then raise exception 'bad_status'; end if;
  if p_day is null or cardinality(p_students) is null or cardinality(p_students) > 500 then raise exception 'bad_input'; end if;
  if exists (select 1 from unnest(p_students) as u(sid) where not private.can_see_student(u.sid)) then raise exception 'not_allowed'; end if;

  if p_status is null then
    delete from public.attendance where student_id = any (p_students) and day = p_day;
  else
    insert into public.attendance (academy_id, student_id, day, status, checked_by)
      select s.academy_id, s.id, p_day, p_status, (select auth.uid())
      from public.students s where s.id = any (p_students)
    on conflict (student_id, day) do update
      set status = excluded.status, checked_by = excluded.checked_by, updated_at = now();
  end if;
end;
$$;

create or replace function public.check_todo(p_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare t record;
begin
  select * into t from public.student_todos where id = p_id;
  if not found or not (private.can_see_student(t.student_id) or private.is_my_child(t.student_id)) then
    raise exception 'not_allowed';
  end if;
  update public.student_todos set done_at = case when p_done then now() else null end where id = p_id;
end;
$$;

-- 원장: 강사별 담당 반 보기 · 정하기
create function public.list_teacher_classes(p_academy uuid)
returns table (user_id uuid, name text, classes text[], timetable_classes text[])
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, coalesce(p.name, p.username, '이름 없음'), m.classes,
    coalesce((select array_agg(distinct t.class_name) from public.timetable t
      where t.academy_id = p_academy and t.teacher_name = coalesce(p.name, p.username)), '{}')
  from public.academy_members m left join public.profiles p on p.id = m.user_id
  where m.academy_id = p_academy and m.role = 'teacher' and private.academy_role(p_academy) = 'owner'
  order by m.created_at;
$$;
revoke execute on function public.list_teacher_classes(uuid) from public, anon;
grant execute on function public.list_teacher_classes(uuid) to authenticated;

create function public.set_teacher_classes(p_academy uuid, p_user uuid, p_classes text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.academy_role(p_academy) is distinct from 'owner' then raise exception 'not_allowed'; end if;
  update public.academy_members
    set classes = coalesce((select array_agg(distinct left(trim(c), 50)) from unnest(p_classes) c where nullif(trim(c), '') is not null), '{}')
    where academy_id = p_academy and user_id = p_user and role = 'teacher';
  if not found then raise exception 'not_teacher'; end if;
end;
$$;
revoke execute on function public.set_teacher_classes(uuid, uuid, text[]) from public, anon;
grant execute on function public.set_teacher_classes(uuid, uuid, text[]) to authenticated;

-- 강사: 내 담당 반 (화면 안내용)
create function public.my_teacher_classes(p_academy uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$ select case when private.academy_role(p_academy) = 'teacher' then private.my_classes(p_academy) else '{}'::text[] end; $$;
revoke execute on function public.my_teacher_classes(uuid) from public, anon;
grant execute on function public.my_teacher_classes(uuid) to authenticated;

/* ---------- 2) 강사 홍보 의뢰 → 원장 결재 ---------- */
alter table public.promo_requests drop constraint promo_requests_status_check;
alter table public.promo_requests add constraint promo_requests_status_check
  check (status in ('owner_review', 'rejected', 'new', 'contacted', 'working', 'review', 'done'));
alter table public.promo_requests add column owner_comment text check (char_length(owner_comment) <= 500);

create or replace function private.fill_promo_requester()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.requested_by := (select auth.uid());
  new.requester_role := private.academy_role(new.academy_id);
  select coalesce(p.name, p.username) into new.requester_name from public.profiles p where p.id = new.requested_by;
  new.status := case when new.requester_role = 'teacher' then 'owner_review' else 'new' end;
  return new;
end;
$$;

alter policy "원장은 우리 학원 의뢰를, 강사는 내 의뢰를, 관" on public.promo_requests
  using (private.academy_role(academy_id) = 'owner' or requested_by = (select auth.uid())
    or (private.is_center_admin() and status not in ('owner_review', 'rejected')));
alter policy "관리자가 홍보 의뢰를 처리" on public.promo_requests
  using (private.is_center_admin() and status not in ('owner_review', 'rejected'))
  with check (private.is_center_admin() and status not in ('owner_review', 'rejected'));
alter policy "원장 또는 의뢰한 사람이 접수 단계 의뢰를 취" on public.promo_requests
  using ((private.academy_role(academy_id) = 'owner' or requested_by = (select auth.uid())) and status in ('owner_review', 'rejected', 'new'));

create function public.decide_promo_request(p_id uuid, p_ok boolean, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r public.promo_requests;
begin
  select * into r from public.promo_requests where id = p_id;
  if r.id is null or private.academy_role(r.academy_id) is distinct from 'owner' then raise exception 'not_allowed'; end if;
  if r.status <> 'owner_review' then raise exception 'already_decided'; end if;
  update public.promo_requests
    set status = case when p_ok then 'new' else 'rejected' end,
        owner_comment = coalesce(nullif(left(trim(coalesce(p_comment, '')), 500), ''), case when p_ok then null else '원장님이 반려했어요' end)
    where id = p_id;
end;
$$;
revoke execute on function public.decide_promo_request(uuid, boolean, text) from public, anon;
grant execute on function public.decide_promo_request(uuid, boolean, text) to authenticated;

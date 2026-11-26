-- 강사도 기본으로 학생 앱 연결 · 그만두기(볼 수 있는 학생만)
--   예전엔 "모든 원생 · 학부모 연결"(students) 권한이 있어야만 앱 연결을 했어요.
--   이제 강사는 담당 반 · 직접 추가한 학생(private.can_see_student)이면 연결 · 풀기를 해요. 권한이 있으면 전부.
create or replace function public.link_family(p_student uuid, p_user uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare aid uuid := (select academy_id from public.students where id = p_student);
begin
  if aid is null or not (private.can_do(aid, 'students')
    or (private.academy_role(aid) = 'teacher' and private.can_see_student(p_student))) then
    raise exception 'not_allowed';
  end if;
  if p_on then
    if not exists (select 1 from public.academy_members where academy_id = aid and user_id = p_user and role in ('parent', 'student')) then
      raise exception 'not_family';
    end if;
    insert into public.student_links (student_id, user_id, academy_id) values (p_student, p_user, aid) on conflict do nothing;
  else
    delete from public.student_links where student_id = p_student and user_id = p_user;
  end if;
end $$;

-- 앱에 가입한 학부모 · 수강생 목록은 원장 · 강사 모두 (연결할 사람을 고르려면 필요해요)
create or replace function public.list_family_members(p_academy uuid)
returns table(user_id uuid, name text, role text, joined_at timestamptz, students uuid[])
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(p.name, p.username, '이름 없음'), m.role, m.created_at,
    coalesce(array_agg(l.student_id) filter (where l.student_id is not null), '{}')
  from public.academy_members m
  left join public.profiles p on p.id = m.user_id
  left join public.student_links l on l.user_id = m.user_id and l.academy_id = m.academy_id
  where m.academy_id = p_academy and m.role in ('parent', 'student')
    and (private.can_do(p_academy, 'students') or private.academy_role(p_academy) = 'teacher')
  group by m.user_id, p.name, p.username, m.role, m.created_at
  order by m.role, m.created_at;
$$;

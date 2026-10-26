-- 센터 관리자 홈 "학원 · 회원 한눈에": 학원마다 회원을 묶어 보여 주려고
-- admin_members에 학원 id 목록(academy_ids)을, admin_academies에 학부모 · 학생 회원 수(families)를 더해요.

drop function if exists public.admin_members();
create function public.admin_members()
returns table(id uuid, name text, username text, email text, provider text, role text, phone text, academies text,
  created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean, academy_ids uuid[])
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.username,
    case when p.username is null then u.email end,
    coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
    p.role, p.phone,
    (select string_agg(a.name || ' (' || case m.role when 'owner' then '원장' when 'teacher' then '강사' when 'parent' then '학부모' when 'student' then '학생' else m.role end || ')', ', ' order by m.created_at)
       from public.academy_members m join public.academies a on a.id = m.academy_id where m.user_id = p.id),
    u.created_at, u.last_sign_in_at,
    exists (select 1 from public.center_admins c where lower(c.email) = lower(u.email)),
    coalesce((select array_agg(m.academy_id order by m.created_at) from public.academy_members m where m.user_id = p.id), '{}')
  from public.profiles p
  join auth.users u on u.id = p.id
  where private.is_center_admin()
  order by u.created_at desc;
$$;
revoke execute on function public.admin_members() from public, anon;
grant execute on function public.admin_members() to authenticated;

drop function if exists public.admin_academies();
create function public.admin_academies()
returns table (id uuid, name text, region text, created_at timestamptz, owners text, teachers int, students int, services jsonb, families int)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, a.region, a.created_at,
    (select string_agg(coalesce(p.name, p.username), ', ') from public.academy_members m left join public.profiles p on p.id = m.user_id
      where m.academy_id = a.id and m.role = 'owner'),
    (select count(*)::int from public.academy_members m where m.academy_id = a.id and m.role = 'teacher'),
    (select count(*)::int from public.students s where s.academy_id = a.id),
    coalesce((select jsonb_object_agg(s.area, jsonb_build_object('status', s.status, 'started_at', s.started_at))
      from public.academy_services s where s.academy_id = a.id), '{}'),
    (select count(*)::int from public.academy_members m where m.academy_id = a.id and m.role in ('parent', 'student'))
  from public.academies a
  where private.is_center_admin()
  order by a.created_at desc;
$$;
revoke execute on function public.admin_academies() from public, anon;
grant execute on function public.admin_academies() to authenticated;

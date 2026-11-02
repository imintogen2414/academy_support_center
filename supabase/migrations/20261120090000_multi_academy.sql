-- 19라운드: 한 아이디로 여러 학원 · 여러 역할 + 센터가 학원 하나만 멈추기
-- 1) 역할은 "학원마다" (academy_members.role). profiles.role은 처음 고른 역할(처음 화면 안내용)로만 남아요.
--    누구나 새 학원을 열 수 있고(create_academy), 초대 코드의 종류가 그 학원에서의 역할을 정해요(join_academy).
--    학부모 · 학생용 코드는 p_as(parent | student)로 어느 쪽인지 고르고, 비우면 처음 고른 역할을 써요.
--    한 학원에서는 역할 하나 — 이미 다른 역할로 들어가 있으면 already_member:역할.
-- 2) 학원 정지(academies.suspended_at): 센터 관리자만 set_academy_suspended로 켜고 꺼요.
--    정지된 학원은 private.academy_role · can_do · is_my_child가 비어서 원장 · 강사 · 학부모 · 학생 모두 자료를 못 봐요(지우지는 않아요).
--    자동 처리(청구 · 미납 안내 · 고정 지출)도 멈춰요. 같은 원장의 다른 학원은 그대로.

alter table public.academies add column if not exists suspended_at timestamptz;
alter table public.academies add column if not exists suspend_note text;
-- 칸별 권한: 원장이 고칠 수 있는 칸(update grant)에는 일부러 넣지 않아요(센터만 RPC로).

-- 정지된 학원이면 역할 · 권한 · 아이 연결이 모두 비어요
create or replace function private.academy_role(aid uuid)
returns text language sql stable security definer set search_path to '' as $$
  select m.role from public.academy_members m join public.academies a on a.id = m.academy_id
  where m.academy_id = aid and m.user_id = (select auth.uid()) and a.suspended_at is null;
$$;

create or replace function private.can_do(aid uuid, perm text)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.academy_members m join public.academies a on a.id = m.academy_id
    where m.academy_id = aid and m.user_id = (select auth.uid()) and a.suspended_at is null
      and (m.role = 'owner' or (m.role = 'teacher' and perm = any (m.perms))));
$$;

create or replace function private.is_my_child(sid uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.student_links l join public.academies a on a.id = l.academy_id
    where l.student_id = sid and l.user_id = (select auth.uid()) and a.suspended_at is null);
$$;

-- 내가 속한 학원 모두 (정지된 학원도 이름 · 안내와 함께 — 학원 표는 정지되면 못 읽어서 이걸로)
create or replace function public.my_academies()
returns table (academy_id uuid, name text, region text, role text, title text, suspended boolean, suspend_note text, joined_at timestamptz)
language sql stable security definer set search_path to '' as $$
  select a.id, a.name, a.region, m.role, m.title, a.suspended_at is not null, a.suspend_note, m.created_at
  from public.academy_members m join public.academies a on a.id = m.academy_id
  where m.user_id = (select auth.uid())
  order by m.created_at;
$$;
revoke all on function public.my_academies() from public, anon;
grant execute on function public.my_academies() to authenticated;

-- 새 학원 열기: 원장으로 가입하지 않았어도(학부모 · 강사도) 같은 아이디로 학원을 열 수 있어요
create or replace function public.create_academy(p_name text, p_region text default null, p_family boolean default true)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  uid uuid := (select auth.uid());
  aid uuid;
  v_phone text;
  v_areas text[];
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if nullif(trim(coalesce(p_name, '')), '') is null then raise exception 'required'; end if;
  -- 너무 많이 만들지 않게 (한 사람이 하루 5곳까지)
  if (select count(*) from public.academies where created_by = uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many';
  end if;
  insert into public.academies (name, region, created_by, family)
    values (left(trim(p_name), 100), nullif(left(trim(coalesce(p_region, '')), 100), ''), uid, coalesce(p_family, true))
    returning id into aid;
  insert into public.academy_members (academy_id, user_id, role) values (aid, uid, 'owner');
  insert into public.academy_codes (academy_id, kind, code) values
    (aid, 'owner', private.new_code()),
    (aid, 'teacher', private.new_code()),
    (aid, 'family', private.new_code());
  -- 처음 고른 역할이 없으면 원장으로
  update public.profiles set role = 'owner' where id = uid and role is null;
  select phone into v_phone from public.profiles where id = uid;
  if v_phone is not null then
    with linked as (
      update public.support_requests set academy_id = aid
       where academy_id is null and created_at > now() - interval '180 days'
         and regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = v_phone
      returning needs
    )
    select array_agg(distinct private.area_id(n)) filter (where private.area_id(n) is not null) into v_areas
      from linked, unnest(linked.needs) n;
    perform private.open_services(aid, coalesce(v_areas, '{}'));
  end if;
  return aid;
end;
$$;

-- 코드로 들어가기: 코드 종류가 그 학원에서의 역할 (처음 고른 역할과 달라도 돼요)
drop function if exists public.join_academy(text);
create or replace function public.join_academy(p_code text, p_as text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  uid uuid := (select auth.uid());
  my_role text;
  c record;
  new_role text;
  had text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select role into my_role from public.profiles where id = uid;
  select academy_id, kind into c from public.academy_codes where code = upper(trim(p_code));
  if not found then raise exception 'invalid_code'; end if;

  new_role := case
    when c.kind = 'owner' then 'owner'
    when c.kind = 'teacher' then 'teacher'
    when c.kind = 'family' and p_as in ('parent', 'student') then p_as
    when c.kind = 'family' and my_role in ('parent', 'student') then my_role
  end;
  if new_role is null then raise exception 'pick_family_role'; end if;

  select role into had from public.academy_members where academy_id = c.academy_id and user_id = uid;
  if had is not null and had <> new_role then raise exception 'already_member:%', had; end if;
  if had is null then
    insert into public.academy_members (academy_id, user_id, role) values (c.academy_id, uid, new_role);
  end if;
  update public.profiles set role = new_role where id = uid and role is null;
  return c.academy_id;
end;
$$;
revoke all on function public.join_academy(text, text) from public, anon;
grant execute on function public.join_academy(text, text) to authenticated;

-- 다른 학원으로 옮기기: 새 학원과 "같은 역할"로 있던 예전 학원에서만 나와요(원장 자리는 그대로)
--   예) 학부모로 옮기면 다른 학원 학부모 자리만 정리, 내가 원장인 학원은 그대로
create or replace function public.move_academy(p_code text)
returns uuid language plpgsql security definer set search_path to '' as $$
declare uid uuid := (select auth.uid()); v uuid; r text;
begin
  v := public.join_academy(p_code);
  select role into r from public.academy_members where academy_id = v and user_id = uid;
  if r <> 'owner' then
    delete from public.student_links l where l.user_id = uid and l.academy_id <> v
      and exists (select 1 from public.academy_members m where m.academy_id = l.academy_id and m.user_id = uid and m.role = r);
    delete from public.academy_members m where m.user_id = uid and m.academy_id <> v and m.role = r;
  end if;
  return v;
end $$;
revoke all on function public.move_academy(text) from public, anon;
grant execute on function public.move_academy(text) to authenticated;

-- 나가기: 정지된 학원에서도 나갈 수 있게 소속을 바로 봐요
create or replace function public.leave_academy(p_academy uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare uid uuid := (select auth.uid()); r text;
begin
  select role into r from public.academy_members where academy_id = p_academy and user_id = uid;
  if r is null then raise exception 'not_member'; end if;
  if r = 'owner' and (select count(*) from public.academy_members where academy_id = p_academy and role = 'owner') < 2 then raise exception 'last_owner'; end if;
  delete from public.student_links where academy_id = p_academy and user_id = uid;
  delete from public.academy_members where academy_id = p_academy and user_id = uid;
end $$;

-- 센터: 학원 정지 · 풀기
create or replace function public.set_academy_suspended(p_academy uuid, p_on boolean, p_note text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not private.is_center_admin() then raise exception 'not_allowed'; end if;
  update public.academies
     set suspended_at = case when p_on then coalesce(suspended_at, now()) end,
         suspend_note = case when p_on then nullif(left(trim(coalesce(p_note, '')), 300), '') end
   where id = p_academy;
  if not found then raise exception 'not_found'; end if;
end $$;
revoke all on function public.set_academy_suspended(uuid, boolean, text) from public, anon;
grant execute on function public.set_academy_suspended(uuid, boolean, text) to authenticated;

-- 센터 학원 목록에 정지 여부 · 원장 아이디(같은 원장의 학원끼리 묶어 보기)
drop function if exists public.admin_academies();
create or replace function public.admin_academies()
returns table (id uuid, name text, region text, created_at timestamptz, owners text, teachers integer, students integer, services jsonb, families integer,
               suspended_at timestamptz, suspend_note text, owner_ids uuid[])
language sql stable security definer set search_path to '' as $$
  select a.id, a.name, a.region, a.created_at,
    (select string_agg(coalesce(p.name, p.username), ', ') from public.academy_members m left join public.profiles p on p.id = m.user_id
      where m.academy_id = a.id and m.role = 'owner'),
    (select count(*)::int from public.academy_members m where m.academy_id = a.id and m.role = 'teacher'),
    (select count(*)::int from public.students s where s.academy_id = a.id),
    coalesce((select jsonb_object_agg(s.area, jsonb_build_object('status', s.status, 'started_at', s.started_at))
      from public.academy_services s where s.academy_id = a.id), '{}'),
    (select count(*)::int from public.academy_members m where m.academy_id = a.id and m.role in ('parent', 'student')),
    a.suspended_at, a.suspend_note,
    coalesce((select array_agg(m.user_id) from public.academy_members m where m.academy_id = a.id and m.role = 'owner'), '{}')
  from public.academies a
  where private.is_center_admin()
  order by a.created_at desc;
$$;
revoke all on function public.admin_academies() from public, anon;
grant execute on function public.admin_academies() to authenticated;

-- 문의: 지금 보고 있는 학원으로 (없거나 내 학원이 아니면 처음 들어간 학원)
drop function if exists public.submit_inquiry(text, text, text, text, boolean);
create or replace function public.submit_inquiry(p_name text, p_contact text, p_category text, p_message text, p_agreed boolean, p_academy uuid default null)
returns text language plpgsql security definer set search_path to '' as $$
declare uid uuid := (select auth.uid()); v_id uuid; m record;
begin
  if nullif(trim(coalesce(p_message, '')), '') is null then raise exception 'required'; end if;
  if uid is null then
    if not coalesce(p_agreed, false) then raise exception 'privacy_required'; end if;
    if nullif(trim(coalesce(p_name, '')), '') is null or nullif(trim(coalesce(p_contact, '')), '') is null then raise exception 'required'; end if;
    insert into public.inquiries (kind, name, contact, category, message, privacy_agreed_at)
    values ('guest', left(trim(p_name), 50), left(trim(p_contact), 100), left(coalesce(nullif(trim(p_category), ''), '기타'), 30), left(trim(p_message), 2000), now())
    returning id into v_id;
  else
    select am.academy_id, a.name, am.role into m from public.academy_members am join public.academies a on a.id = am.academy_id
      where am.user_id = uid order by (am.academy_id = p_academy) desc, am.created_at limit 1;
    insert into public.inquiries (kind, user_id, academy_id, academy_name, role, name, contact, category, message)
    values ('member', uid, m.academy_id, m.name, m.role,
      left(coalesce(nullif(trim(coalesce(p_name, '')), ''), (select coalesce(p.name, p.username) from public.profiles p where p.id = uid), '회원'), 50),
      nullif(left(trim(coalesce(p_contact, '')), 100), ''), left(coalesce(nullif(trim(p_category), ''), '기타'), 30), left(trim(p_message), 2000))
    returning id into v_id;
  end if;
  return upper(left(replace(v_id::text, '-', ''), 8));
end;
$$;
grant execute on function public.submit_inquiry(text, text, text, text, boolean, uuid) to anon, authenticated;

-- 채용 게시판 · 이력서: 처음 고른 역할이 아니어도, 어느 학원에서든 강사면 강사로
create or replace function private.my_role()
returns text language sql stable security definer set search_path to '' as $$
  select case when exists (select 1 from public.academy_members where user_id = (select auth.uid()) and role = 'teacher') then 'teacher'
              else (select role from public.profiles where id = (select auth.uid())) end;
$$;

-- 정지된 학원은 자동 처리(청구 · 미납 안내 · 서류 · 고정 지출)를 건너뛰어요
do $patch$
declare d text;
begin
  d := pg_get_functiondef('private.run_automations(uuid)'::regprocedure);
  if position('a.suspended_at is null' in d) = 0 then
    d := replace(d, 'and a.auto <> ''{}''::jsonb loop', 'and a.auto <> ''{}''::jsonb and a.suspended_at is null loop');
    if position('a.suspended_at is null' in d) = 0 then raise exception 'patch run_automations failed'; end if;
    execute d;
  end if;
  d := pg_get_functiondef('private.run_fixed_costs(uuid)'::regprocedure);
  if position('suspended_at is null' in d) = 0 then
    d := replace(d, 'where active and (p_academy is null or academy_id = p_academy) loop',
      'where active and (p_academy is null or academy_id = p_academy) and academy_id in (select x.id from public.academies x where x.suspended_at is null) loop');
    if position('suspended_at is null' in d) = 0 then raise exception 'patch run_fixed_costs failed'; end if;
    execute d;
  end if;
end $patch$;

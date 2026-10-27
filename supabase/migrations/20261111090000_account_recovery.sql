-- 아이디 · 비밀번호 찾기
-- 1) 가입할 때 휴대폰 + 이메일을 받아요(profiles.email, 연락 · 찾기용 진짜 이메일). 구글 회원은 구글 이메일이 저절로 들어가요.
-- 2) 센터 관리자 시험용 휴대폰 010-2369-9657은 몇 번이고 다시 가입할 수 있게 휴대폰 · 이메일 겹침 검사에서 빼요.
-- 3) 비밀번호 찾기 인증번호(recovery_codes)는 Edge Function account-help만 써요(RLS를 켜고 정책이 없어서 앱에서는 못 읽어요).

alter table public.profiles add column if not exists email text;
grant update (email) on public.profiles to authenticated;

-- 시험용 휴대폰은 겹쳐도 돼요 (인덱스 조건은 글자 그대로 써야 해서 번호를 직접 적어요)
create or replace function private.is_test_phone(p text) returns boolean language sql immutable set search_path = ''
as $$ select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') = '01023699657'; $$;

drop index if exists public.profiles_phone_uniq;
create unique index profiles_phone_uniq on public.profiles (phone) where phone is not null and phone <> '01023699657';
create unique index if not exists profiles_email_uniq on public.profiles (lower(email))
  where email is not null and coalesce(phone, '') <> '01023699657';

-- 구글로 가입한 회원은 구글 이메일을 넣어 둬요 (겹치면 비워 둬요)
update public.profiles p set email = lower(u.email)
  from auth.users u
 where u.id = p.id and p.email is null and u.email is not null
   and u.email !~* '@id\.academysupportcenter\.app$'
   and not exists (select 1 from public.profiles q where lower(q.email) = lower(u.email));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), new.raw_user_meta_data ->> 'full_name'), 50);
  v_phone text := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g'), '');
  v_user text := nullif(lower(new.raw_user_meta_data ->> 'username'), '');
  v_email text := nullif(lower(trim(coalesce(new.raw_user_meta_data ->> 'email', ''))), '');
begin
  if v_phone is not null and v_phone !~ '^0[0-9]{8,10}$' then v_phone := null; end if;
  -- 구글 회원은 구글 이메일, 아이디 회원은 가입할 때 적은 이메일
  if v_email is null and new.email is not null and new.email !~* '@id\.academysupportcenter\.app$' then v_email := lower(new.email); end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_email := null; end if;
  if v_user is null then
    if exists (select 1 from public.profiles where private.norm_name(name) = private.norm_name(v_name)) then v_name := null; end if;
    if not private.is_test_phone(v_phone) and exists (select 1 from public.profiles where phone = v_phone) then v_phone := null; end if;
  end if;
  -- 구글 회원 이메일이 다른 회원과 겹치면 비워 둬요 (아이디 가입은 유일 인덱스가 막고, 화면이 미리 check_profile_taken으로 알려요)
  if v_user is null and v_email is not null and not private.is_test_phone(v_phone)
     and exists (select 1 from public.profiles where lower(email) = v_email and not private.is_test_phone(phone)) then v_email := null; end if;
  insert into public.profiles (id, username, name, role, academy_name, phone, email)
  values (
    new.id, v_user, v_name,
    case when new.raw_user_meta_data ->> 'role' in ('owner', 'teacher', 'parent', 'student')
         then new.raw_user_meta_data ->> 'role' end,
    left(nullif(new.raw_user_meta_data ->> 'academy_name', ''), 100),
    v_phone, left(v_email, 200)
  );
  return new;
end;
$$;

-- 겹침 확인에 이메일을 더해요 (시험용 휴대폰은 휴대폰 · 이메일이 겹쳐도 괜찮아요)
drop function if exists public.check_profile_taken(text, text, text);
create or replace function public.check_profile_taken(p_username text, p_name text, p_phone text, p_email text default null)
returns text[] language sql stable security definer set search_path = ''
as $$
  select array_remove(array[
    case when nullif(trim(coalesce(p_username, '')), '') is not null and exists (select 1 from public.profiles
      where lower(username) = lower(trim(p_username)) and id is distinct from (select auth.uid())) then 'username' end,
    case when private.norm_name(p_name) is not null and exists (select 1 from public.profiles
      where private.norm_name(name) = private.norm_name(p_name) and id is distinct from (select auth.uid())) then 'name' end,
    case when nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '') is not null and not private.is_test_phone(p_phone) and exists (select 1 from public.profiles
      where phone = regexp_replace(p_phone, '[^0-9]', '', 'g') and id is distinct from (select auth.uid())) then 'phone' end,
    case when nullif(trim(coalesce(p_email, '')), '') is not null and not private.is_test_phone(p_phone) and exists (select 1 from public.profiles
      where lower(email) = lower(trim(p_email)) and not private.is_test_phone(phone) and id is distinct from (select auth.uid())) then 'email' end
  ], null);
$$;
grant execute on function public.check_profile_taken(text, text, text, text) to anon, authenticated;

-- 인증번호: 숫자는 저장하지 않고 해시만, 10분 안에 5번까지 맞혀 볼 수 있어요
create table if not exists public.recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  channel text not null check (channel in ('phone', 'email')),
  target text not null,
  code_hash text not null,
  tries int not null default 0,
  used_at timestamptz,
  expires_at timestamptz not null default now() + interval '10 minutes',
  created_at timestamptz not null default now()
);
create index if not exists recovery_codes_user on public.recovery_codes (user_id, created_at desc);
alter table public.recovery_codes enable row level security;
revoke all on public.recovery_codes from anon, authenticated;

-- 회원 상세에 이메일도 보여요
create or replace function public.admin_members()
returns table(id uuid, name text, username text, email text, provider text, role text, phone text, academies text, created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean, academy_ids uuid[])
language sql stable security definer set search_path = ''
as $$
  select p.id, p.name, p.username,
    coalesce(p.email, case when p.username is null then u.email end),
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

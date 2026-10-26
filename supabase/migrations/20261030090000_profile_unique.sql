-- 내 정보 · 중복 막기: 전화번호를 받고, 이름 · 아이디 · 전화번호는 다른 사람과 겹치지 않게 해요
-- 이름은 띄어쓰기 · 대소문자를 빼고 비교해요(홍 길동 = 홍길동). 전화번호는 숫자만 저장해요.

alter table public.profiles add column phone text check (phone ~ '^0[0-9]{8,10}$');

create function private.norm_name(p text)
returns text
language sql
immutable
set search_path = ''
as $$ select nullif(lower(regexp_replace(coalesce(p, ''), '\s+', '', 'g')), ''); $$;

create unique index profiles_name_uniq on public.profiles (private.norm_name(name)) where name is not null;
create unique index profiles_phone_uniq on public.profiles (phone) where phone is not null;
create unique index if not exists profiles_username_uniq on public.profiles (lower(username)) where username is not null;

-- 가입 · 내 정보 고치기 전에: 이미 쓰고 있는 것을 알려 줘요 (username · name · phone 중 겹치는 것, 로그인했으면 나는 빼고)
create function public.check_profile_taken(p_username text, p_name text, p_phone text)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when nullif(trim(coalesce(p_username, '')), '') is not null and exists (select 1 from public.profiles
      where lower(username) = lower(trim(p_username)) and id is distinct from (select auth.uid())) then 'username' end,
    case when private.norm_name(p_name) is not null and exists (select 1 from public.profiles
      where private.norm_name(name) = private.norm_name(p_name) and id is distinct from (select auth.uid())) then 'name' end,
    case when nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '') is not null and exists (select 1 from public.profiles
      where phone = regexp_replace(p_phone, '[^0-9]', '', 'g') and id is distinct from (select auth.uid())) then 'phone' end
  ], null);
$$;
revoke execute on function public.check_profile_taken(text, text, text) from public;
grant execute on function public.check_profile_taken(text, text, text) to anon, authenticated;

-- 가입할 때 전화번호도 저장. 아이디 가입은 이름 · 전화번호가 겹치면 가입이 안 돼요(화면이 먼저 확인해요).
-- 구글로 처음 오면 구글 이름이 다른 사람과 같을 수 있어서, 겹치면 이름을 비워 두고 앱에서 다시 정하게 해요.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), new.raw_user_meta_data ->> 'full_name'), 50);
  v_phone text := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g'), '');
  v_user text := nullif(lower(new.raw_user_meta_data ->> 'username'), '');
begin
  if v_phone is not null and v_phone !~ '^0[0-9]{8,10}$' then v_phone := null; end if;
  if v_user is null then
    if exists (select 1 from public.profiles where private.norm_name(name) = private.norm_name(v_name)) then v_name := null; end if;
    if exists (select 1 from public.profiles where phone = v_phone) then v_phone := null; end if;
  end if;
  insert into public.profiles (id, username, name, role, academy_name, phone)
  values (
    new.id, v_user, v_name,
    case when new.raw_user_meta_data ->> 'role' in ('owner', 'teacher', 'parent', 'student')
         then new.raw_user_meta_data ->> 'role' end,
    left(nullif(new.raw_user_meta_data ->> 'academy_name', ''), 100),
    v_phone
  );
  return new;
end;
$$;

-- 전화번호도 본인이 고쳐요 (본인 것만 고치는 정책은 그대로)
grant update (phone) on public.profiles to authenticated;

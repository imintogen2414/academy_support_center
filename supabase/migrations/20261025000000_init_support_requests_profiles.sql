-- 1단계 테이블: 지원 신청(학원 → 센터)과 회원 프로필
-- Supabase 프로젝트 "학원지원센터"에 적용된 내용과 같아요.

/* ---------- 지원 신청: 첫 화면 왼쪽 "지원 신청"이 쌓이는 곳 ----------
   누구나(로그인 없이도) 신청을 넣을 수 있지만, 읽기는 막아 둡니다.
   센터는 Supabase 대시보드(Table Editor)에서 확인해요. */
create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  academy_name text not null check (char_length(academy_name) between 1 and 100),
  region text check (char_length(region) <= 100),
  owner_name text not null check (char_length(owner_name) between 1 and 50),
  phone text not null check (char_length(phone) between 5 and 30),
  needs text[] not null check (cardinality(needs) between 1 and 10),
  memo text check (char_length(memo) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'done')),
  created_at timestamptz not null default now()
);
comment on table public.support_requests is '학원 → 학원지원센터 지원 신청 (첫 화면 신청서)';

alter table public.support_requests enable row level security;

create policy "누구나 새 지원 신청을 넣을 수 있음"
  on public.support_requests for insert
  to anon, authenticated
  with check (status = 'new');

revoke all on public.support_requests from anon, authenticated;
grant insert (academy_name, region, owner_name, phone, needs, memo) on public.support_requests to anon, authenticated;

/* ---------- 회원 프로필: 가입하면 자동으로 한 줄 생김 ---------- */
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{4,20}$'),
  name text check (char_length(name) <= 50),
  role text check (role in ('owner', 'teacher', 'parent', 'student')),
  academy_name text check (char_length(academy_name) <= 100),
  created_at timestamptz not null default now()
);
comment on table public.profiles is '회원 프로필 (아이디·이름·역할·학원)';

alter table public.profiles enable row level security;

create policy "내 프로필만 볼 수 있음"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "내 프로필만 고칠 수 있음"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, role, academy_name) on public.profiles to authenticated;

-- 가입할 때 넘긴 정보(아이디·이름·역할·학원)로 프로필을 만들어요. 구글 가입은 이름만 채워져요.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, name, role, academy_name)
  values (
    new.id,
    nullif(lower(new.raw_user_meta_data ->> 'username'), ''),
    left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), new.raw_user_meta_data ->> 'full_name'), 50),
    case when new.raw_user_meta_data ->> 'role' in ('owner', 'teacher', 'parent', 'student')
         then new.raw_user_meta_data ->> 'role' end,
    left(nullif(new.raw_user_meta_data ->> 'academy_name', ''), 100)
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

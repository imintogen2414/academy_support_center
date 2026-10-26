-- 8단계: 센터 관리자 신청 → 지금 관리자가 수락 · 거절
-- 직접 읽기·쓰기는 막고 RPC로만 다뤄요. 수락하면 신청한 사람의 확인된 이메일이 center_admins에 들어가요.

create table public.admin_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  name text check (char_length(name) <= 50),
  reason text check (char_length(reason) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
-- 한 사람은 기다리는 신청을 하나만
create unique index admin_applications_pending_uniq on public.admin_applications (user_id) where status = 'pending';
create index admin_applications_user_idx on public.admin_applications (user_id);
comment on table public.admin_applications is '센터 관리자 신청 (직접 읽기·쓰기 막힘, RPC로만)';
alter table public.admin_applications enable row level security;
revoke all on public.admin_applications from anon, authenticated;

-- 내 이메일이 관리자로 인정될 수 있는 이메일인지 (구글로 확인된 이메일이거나 센터 아이디)
create function private.my_verified_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email) from auth.users u
  where u.id = (select auth.uid())
    and (lower(u.email) like '%@id.academysupportcenter.app'
         or exists (select 1 from auth.identities i
                    where i.user_id = u.id and i.provider = 'google'
                      and lower(i.identity_data ->> 'email') = lower(u.email)));
$$;
revoke execute on function private.my_verified_email() from public, anon, authenticated;

-- 관리자 신청
create function public.apply_center_admin(p_name text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  em text := private.my_verified_email();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if private.is_center_admin() then raise exception 'already_admin'; end if;
  if em is null then raise exception 'not_verified'; end if;
  if exists (select 1 from public.admin_applications where user_id = uid and status = 'pending') then
    raise exception 'already_pending';
  end if;
  insert into public.admin_applications (user_id, email, name, reason)
    values (uid, em, nullif(left(trim(coalesce(p_name, '')), 50), ''), nullif(left(trim(coalesce(p_reason, '')), 500), ''));
end;
$$;

-- 내 가장 최근 신청
create function public.my_admin_application()
returns table (status text, created_at timestamptz, decided_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select status, created_at, decided_at from public.admin_applications
  where user_id = (select auth.uid())
  order by (status = 'pending') desc, created_at desc limit 1;
$$;

-- 관리자: 신청 목록 (기다리는 것 먼저)
create function public.list_admin_applications()
returns table (id uuid, email text, name text, reason text, status text, created_at timestamptz, decided_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.email, coalesce(a.name, p.name, p.username), a.reason, a.status, a.created_at, a.decided_at
  from public.admin_applications a
  left join public.profiles p on p.id = a.user_id
  where private.is_center_admin()
  order by (a.status = 'pending') desc, a.created_at desc
  limit 200;
$$;

-- 관리자: 수락(p_ok = true)하면 관리자 명단에 넣고, 거절하면 기록만 남겨요
create function public.decide_admin_application(p_id uuid, p_ok boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare a record;
begin
  if not private.is_center_admin() then raise exception 'admin_only'; end if;
  select * into a from public.admin_applications where id = p_id and status = 'pending' for update;
  if not found then raise exception 'not_pending'; end if;
  update public.admin_applications
    set status = case when p_ok then 'approved' else 'rejected' end, decided_by = (select auth.uid()), decided_at = now()
    where id = p_id;
  if p_ok then
    insert into public.center_admins (email, name, added_by) values (a.email, a.name, (select auth.uid()))
      on conflict (email) do update set name = coalesce(public.center_admins.name, excluded.name);
  end if;
end;
$$;

revoke execute on function public.apply_center_admin(text, text), public.my_admin_application(),
  public.list_admin_applications(), public.decide_admin_application(uuid, boolean) from public, anon;
grant execute on function public.apply_center_admin(text, text), public.my_admin_application(),
  public.list_admin_applications(), public.decide_admin_application(uuid, boolean) to authenticated;

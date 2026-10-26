-- 파트너 계정: 인투유학 · 인투마케팅 담당자가 원장님 신청을 바로 받아 처리해요.
-- 센터장(관리자)은 지금처럼 전부 보고, 중간에 문제가 있을 때만 상태 · 메모를 바꿔요.
--   인투마케팅: 홍보 의뢰(promo_requests, 원장 결재 전 · 반려 빼고)
--   인투유학: 유학 상담(abroad_requests, 원장이 넘긴 것) + 유학 제휴 신청(partner_applications, 유학 제휴처 a1~a5)

create table public.partner_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  partner text not null check (partner in ('intoabroad', 'intomarketing')),
  name text check (char_length(name) <= 50),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.partner_members is '파트너 담당자 (인투유학 · 인투마케팅)';
alter table public.partner_members enable row level security;
create policy "파트너: 내 줄 · 관리자는 전부" on public.partner_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_center_admin());
revoke all on public.partner_members from anon, authenticated;
grant select on public.partner_members to authenticated;

create function private.my_partner()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select partner from public.partner_members where user_id = (select auth.uid()); $$;
revoke execute on function private.my_partner() from public, anon;
grant execute on function private.my_partner() to authenticated;

create function public.my_partner()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select private.my_partner(); $$;
revoke execute on function public.my_partner() from public, anon;
grant execute on function public.my_partner() to authenticated;

-- 관리자: 담당자 목록 · 추가(아이디 또는 구글 이메일, 이미 가입한 사람) · 빼기
create function public.list_partner_members()
returns table(user_id uuid, partner text, name text, username text, email text, created_at timestamptz, last_sign_in_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, m.partner, coalesce(m.name, p.name), p.username, case when p.username is null then u.email end, m.created_at, u.last_sign_in_at
  from public.partner_members m join auth.users u on u.id = m.user_id left join public.profiles p on p.id = m.user_id
  where private.is_center_admin()
  order by m.partner, m.created_at;
$$;
revoke execute on function public.list_partner_members() from public, anon;
grant execute on function public.list_partner_members() to authenticated;

create function public.add_partner_member(p_who text, p_partner text, p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid; w text := lower(trim(coalesce(p_who, '')));
begin
  if not private.is_center_admin() then raise exception 'admin_only'; end if;
  if p_partner not in ('intoabroad', 'intomarketing') then raise exception 'bad_partner'; end if;
  select id into v_user from public.profiles where lower(username) = w;
  if v_user is null then select id into v_user from auth.users where lower(email) = w; end if;
  if v_user is null then raise exception 'not_found'; end if;
  insert into public.partner_members (user_id, partner, name, added_by)
    values (v_user, p_partner, nullif(left(trim(coalesce(p_name, '')), 50), ''), (select auth.uid()))
  on conflict (user_id) do update set partner = excluded.partner, name = coalesce(excluded.name, public.partner_members.name);
  return v_user;
end;
$$;
revoke execute on function public.add_partner_member(text, text, text) from public, anon;
grant execute on function public.add_partner_member(text, text, text) to authenticated;

create function public.remove_partner_member(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_center_admin() then raise exception 'admin_only'; end if;
  delete from public.partner_members where user_id = p_user;
end;
$$;
revoke execute on function public.remove_partner_member(uuid) from public, anon;
grant execute on function public.remove_partner_member(uuid) to authenticated;

-- 파트너가 보고 처리하는 범위
create policy "파트너 인투마케팅 의뢰 보기" on public.promo_requests for select to authenticated
  using (private.my_partner() = 'intomarketing' and status not in ('owner_review', 'rejected'));
create policy "파트너 인투마케팅 의뢰 처리" on public.promo_requests for update to authenticated
  using (private.my_partner() = 'intomarketing' and status not in ('owner_review', 'rejected'))
  with check (private.my_partner() = 'intomarketing' and status not in ('owner_review', 'rejected'));

create policy "파트너 인투유학 상담 보기" on public.abroad_requests for select to authenticated
  using (private.my_partner() = 'intoabroad' and status in ('forwarded', 'done'));
create policy "파트너 인투유학 상담 처리" on public.abroad_requests for update to authenticated
  using (private.my_partner() = 'intoabroad' and status in ('forwarded', 'done'))
  with check (private.my_partner() = 'intoabroad' and status in ('forwarded', 'done'));

create policy "파트너 인투유학 제휴 보기" on public.partner_applications for select to authenticated
  using (private.my_partner() = 'intoabroad' and status <> 'owner_review' and partner_id like 'a%');
create policy "파트너 인투유학 제휴 처리" on public.partner_applications for update to authenticated
  using (private.my_partner() = 'intoabroad' and status <> 'owner_review' and partner_id like 'a%')
  with check (private.my_partner() = 'intoabroad' and status <> 'owner_review' and partner_id like 'a%');

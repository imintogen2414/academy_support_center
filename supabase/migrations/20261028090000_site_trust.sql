-- 첫 화면 신뢰도: 지원 신청에 개인정보 동의 · 연락 받을 시간 · 접수 번호, 그리고 문의 창(가입 전 · 프로그램 사용자)

/* ---------- 지원 신청: 동의 · 연락 받을 시간 + 접수 번호를 돌려주는 RPC ---------- */
alter table public.support_requests
  add column privacy_agreed_at timestamptz,
  add column contact_time text check (char_length(contact_time) <= 30);

-- 서버에서도 필수 항목 · 전화번호 형식 · 동의를 확인하고, 접수 번호(앞 8자리)를 돌려줘요
create function public.submit_support_request(
  p_academy text, p_region text, p_name text, p_phone text, p_needs text[], p_memo text, p_contact_time text, p_agreed boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid; v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if not coalesce(p_agreed, false) then raise exception 'privacy_required'; end if;
  if nullif(trim(coalesce(p_academy, '')), '') is null or nullif(trim(coalesce(p_name, '')), '') is null then raise exception 'required'; end if;
  if v_phone !~ '^0[0-9]{8,10}$' then raise exception 'bad_phone'; end if;
  if coalesce(array_length(p_needs, 1), 0) = 0 then raise exception 'need_required'; end if;
  insert into public.support_requests (academy_name, region, owner_name, phone, needs, memo, contact_time, privacy_agreed_at)
  values (left(trim(p_academy), 100), nullif(left(trim(coalesce(p_region, '')), 100), ''), left(trim(p_name), 50),
          left(trim(p_phone), 30), p_needs[1:10], nullif(left(trim(coalesce(p_memo, '')), 2000), ''),
          nullif(left(trim(coalesce(p_contact_time, '')), 30), ''), now())
  returning id into v_id;
  return upper(left(replace(v_id::text, '-', ''), 8));
end;
$$;
revoke execute on function public.submit_support_request(text, text, text, text, text[], text, text, boolean) from public;
grant execute on function public.submit_support_request(text, text, text, text, text[], text, text, boolean) to anon, authenticated;

/* ---------- 문의: 가입 전 누구나 · 프로그램 쓰는 분 따로 ---------- */
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('guest', 'member')),
  user_id uuid references auth.users (id) on delete set null,
  academy_id uuid references public.academies (id) on delete set null,
  academy_name text,
  role text,
  name text not null check (char_length(name) between 1 and 50),
  contact text check (char_length(contact) <= 100),
  category text not null check (char_length(category) <= 30),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'answered', 'closed')),
  answer text check (char_length(answer) <= 2000),
  answered_at timestamptz,
  privacy_agreed_at timestamptz,
  created_at timestamptz not null default now()
);
create index inquiries_user_idx on public.inquiries (user_id);
comment on table public.inquiries is '문의 (가입 전 guest · 프로그램 사용자 member). 넣기는 submit_inquiry, 답변은 관리자 answer_inquiry';
alter table public.inquiries enable row level security;
create policy "문의 보기: 내 것 · 관리자" on public.inquiries for select to authenticated
  using (user_id = (select auth.uid()) or private.is_center_admin());
revoke all on public.inquiries from anon, authenticated;
grant select on public.inquiries to authenticated;

create function public.submit_inquiry(p_name text, p_contact text, p_category text, p_message text, p_agreed boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); v_id uuid; m record;
begin
  if nullif(trim(coalesce(p_message, '')), '') is null then raise exception 'required'; end if;
  if uid is null then
    -- 가입 전: 이름 · 연락처 · 동의가 꼭 있어야 답을 드릴 수 있어요
    if not coalesce(p_agreed, false) then raise exception 'privacy_required'; end if;
    if nullif(trim(coalesce(p_name, '')), '') is null or nullif(trim(coalesce(p_contact, '')), '') is null then raise exception 'required'; end if;
    insert into public.inquiries (kind, name, contact, category, message, privacy_agreed_at)
    values ('guest', left(trim(p_name), 50), left(trim(p_contact), 100), left(coalesce(nullif(trim(p_category), ''), '기타'), 30), left(trim(p_message), 2000), now())
    returning id into v_id;
  else
    select am.academy_id, a.name, am.role into m from public.academy_members am join public.academies a on a.id = am.academy_id
      where am.user_id = uid order by am.created_at limit 1;
    insert into public.inquiries (kind, user_id, academy_id, academy_name, role, name, contact, category, message)
    values ('member', uid, m.academy_id, m.name, m.role,
      left(coalesce(nullif(trim(coalesce(p_name, '')), ''), (select coalesce(p.name, p.username) from public.profiles p where p.id = uid), '회원'), 50),
      nullif(left(trim(coalesce(p_contact, '')), 100), ''), left(coalesce(nullif(trim(p_category), ''), '기타'), 30), left(trim(p_message), 2000))
    returning id into v_id;
  end if;
  return upper(left(replace(v_id::text, '-', ''), 8));
end;
$$;
revoke execute on function public.submit_inquiry(text, text, text, text, boolean) from public;
grant execute on function public.submit_inquiry(text, text, text, text, boolean) to anon, authenticated;

create function public.answer_inquiry(p_id uuid, p_answer text, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_center_admin() then raise exception 'not_allowed'; end if;
  if p_status not in ('new', 'answered', 'closed') then raise exception 'bad_status'; end if;
  update public.inquiries set status = p_status, answer = nullif(left(trim(coalesce(p_answer, '')), 2000), ''),
    answered_at = case when p_status = 'answered' then now() else answered_at end
  where id = p_id;
end;
$$;
revoke execute on function public.answer_inquiry(uuid, text, text) from public, anon;
grant execute on function public.answer_inquiry(uuid, text, text) to authenticated;

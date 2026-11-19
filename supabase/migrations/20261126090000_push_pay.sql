-- 휴대폰 알림(웹 푸시) · 온라인 카드 결제(토스페이먼츠, 지금은 테스트) · 대량이체 받는 사람 계좌
create extension if not exists pg_net with schema extensions;

-- 1) 알림 받는 기기 (휴대폰 · PC 브라우저마다 한 줄, 본인 것만)
create table if not exists public.push_subs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  ua text check (char_length(ua) <= 300),
  kinds text[] not null default '{chat,notice,attend,approval,pay}',
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  fails int not null default 0
);
alter table public.push_subs enable row level security;
create policy "내 기기 보기" on public.push_subs for select to authenticated using (user_id = (select auth.uid()));
create policy "내 기기 넣기" on public.push_subs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "내 기기 고치기" on public.push_subs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "내 기기 빼기" on public.push_subs for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.push_subs to authenticated;
grant insert (endpoint, p256dh, auth, ua, kinds) on public.push_subs to authenticated;
grant update (p256dh, auth, ua, kinds) on public.push_subs to authenticated;
create index if not exists push_subs_user on public.push_subs(user_id);

-- 같은 기기를 다시 켜면(다른 계정으로 로그인 포함) 그 기기는 지금 계정 것으로
create or replace function public.save_push_sub(p_endpoint text, p_p256dh text, p_auth text, p_ua text, p_kinds text[] default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  insert into public.push_subs (user_id, endpoint, p256dh, auth, ua, kinds)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_ua, 300), coalesce(p_kinds, '{chat,notice,attend,approval,pay}'))
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua,
    kinds = coalesce(p_kinds, public.push_subs.kinds), fails = 0;
end $$;
grant execute on function public.save_push_sub(text, text, text, text, text[]) to authenticated;

-- 2) 보낼 알림 (서비스 키만 — Edge Function push-send가 꺼내 보내요)
create table if not exists public.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  url text,
  tag text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  result text
);
alter table public.push_outbox enable row level security;
create index if not exists push_outbox_wait on public.push_outbox(id) where sent_at is null;

-- 알림 쌓기: 알림을 켠 사람에게만, 쌓고 나면 push-send를 한 번 깨워요 (주소 · 비밀 값은 vault)
create or replace function private.push(p_users uuid[], p_kind text, p_title text, p_body text, p_url text, p_tag text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare n int; u text; s text;
begin
  insert into public.push_outbox (user_id, kind, title, body, url, tag)
  select distinct x, p_kind, left(p_title, 80), left(coalesce(p_body, ''), 200), p_url, p_tag
  from unnest(p_users) x
  where x is not null and exists (select 1 from public.push_subs s where s.user_id = x and p_kind = any (s.kinds));
  get diagnostics n = row_count;
  if n = 0 then return; end if;
  select decrypted_secret into u from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into s from vault.decrypted_secrets where name = 'push_hook';
  if u is null or s is null then return; end if;
  perform net.http_post(url := u, body := '{}'::jsonb, headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', s), timeout_milliseconds := 5000);
exception when others then
  -- 알림이 안 가도 원래 일(메시지 · 출석 저장)은 그대로 돼야 해요
  raise warning 'push failed: %', sqlerrm;
end $$;

-- 학원에서 이 권한이 있는 사람(원장 + 권한 켠 강사)
create or replace function private.staff_with(aid uuid, perm text) returns uuid[] language sql stable security definer set search_path = ''
as $$ select coalesce(array_agg(user_id), '{}') from public.academy_members where academy_id = aid and (role = 'owner' or (role = 'teacher' and perm = any (perms))); $$;

-- 채팅: 방 사람에게 (보낸 사람 빼고), 같은 방 알림은 하나로 바꿔 끼워요(tag)
create or replace function private.push_message() returns trigger language plpgsql security definer set search_path = ''
as $$
declare who text; room text; k text; tgt uuid[];
begin
  select coalesce(p.name, p.username, '누군가') into who from public.profiles p where p.id = new.sender_id;
  select c.kind, c.title into k, room from public.conversations c where c.id = new.conversation_id;
  select array_agg(m.user_id) into tgt from public.conversation_members m where m.conversation_id = new.conversation_id and m.user_id <> new.sender_id;
  perform private.push(tgt, 'chat', case when k = 'group' and room is not null then room || ' · ' || who else who end,
    case when coalesce(new.body, '') <> '' then new.body when jsonb_array_length(coalesce(new.files, '[]')) > 0 then '사진 · 파일을 보냈어요' else '새 메시지' end,
    '/app#messages', 'chat-' || new.conversation_id);
  return null;
end $$;
drop trigger if exists push_message on public.messages;
create trigger push_message after insert on public.messages for each row execute function private.push_message();

-- 공지: 전체면 학원 학부모 · 학생 모두, 반 공지면 그 반 아이와 연결된 사람만
create or replace function private.push_notice() returns trigger language plpgsql security definer set search_path = ''
as $$
declare tgt uuid[]; an text;
begin
  select name into an from public.academies where id = new.academy_id;
  if new.target_class is null then
    select array_agg(user_id) into tgt from public.academy_members where academy_id = new.academy_id and role in ('parent', 'student');
  else
    select array_agg(distinct l.user_id) into tgt from public.student_links l join public.students s on s.id = l.student_id
      where l.academy_id = new.academy_id and s.class_name = new.target_class;
  end if;
  perform private.push(tgt, 'notice', coalesce(an, '학원') || ' 공지', new.title, '/app#news/' || new.id, 'notice-' || new.id);
  return null;
end $$;
drop trigger if exists push_notice on public.notices;
create trigger push_notice after insert on public.notices for each row execute function private.push_notice();

-- 출석: 아이와 연결된 학부모에게 (상태가 바뀔 때만)
create or replace function private.push_attend() returns trigger language plpgsql security definer set search_path = ''
as $$
declare tgt uuid[]; nm text; t text;
begin
  if new.status is null or (tg_op = 'UPDATE' and old.status is not distinct from new.status) then return null; end if;
  if new.day <> (now() at time zone 'Asia/Seoul')::date then return null; end if; -- 지난 날짜 고치기는 알리지 않아요
  select name into nm from public.students where id = new.student_id;
  select array_agg(l.user_id) into tgt from public.student_links l join public.academy_members m on m.academy_id = l.academy_id and m.user_id = l.user_id and m.role = 'parent'
    where l.student_id = new.student_id;
  t := to_char(coalesce(new.checked_at, now()) at time zone 'Asia/Seoul', 'HH24:MI');
  perform private.push(tgt, 'attend', coalesce(nm, '아이') || ' ' || case new.status when 'present' then '출석' when 'late' then '지각' when 'absent' then '결석' when 'early' then '조퇴' else new.status end,
    t || case new.method when 'qr' then ' · QR로 출석했어요' when 'kiosk' then ' · 출석 번호로 출석했어요' else ' · 선생님이 넣었어요' end,
    '/app#kid/attend', 'attend-' || new.student_id);
  return null;
end $$;
drop trigger if exists push_attend on public.attendance;
create trigger push_attend after insert or update of status on public.attendance for each row execute function private.push_attend();

-- 결재 요청: 원장 + 결재 처리 권한 (올린 사람 빼고)
create or replace function private.push_approval() returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.push(array_remove(private.staff_with(new.academy_id, 'approvals'), new.requested_by), 'approval',
    '결재 요청 · ' || coalesce(new.requester_name, ''), new.title || case when new.amount is not null then ' · ' || to_char(new.amount, 'FM999,999,999') || '원' else '' end,
    '/app#admin/approvals', 'apv-' || new.id);
  return null;
end $$;
drop trigger if exists push_approval on public.approvals;
create trigger push_approval after insert on public.approvals for each row execute function private.push_approval();

-- 입금 알림("보냈어요")과 온라인 결제: 원장 + 수납 권한
create or replace function private.push_invoice() returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.reported_at is not null and old.reported_at is null then
    perform private.push(private.staff_with(new.academy_id, 'billing'), 'pay', '입금 알림 · ' || coalesce(new.student_name, ''),
      coalesce(new.title, '수강료') || ' ' || to_char(new.amount, 'FM999,999,999') || '원을 보냈대요 · 확인해 주세요', '/app#admin/billing', 'inv-' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists push_invoice on public.invoices;
create trigger push_invoice after update of reported_at on public.invoices for each row execute function private.push_invoice();

-- 시험 알림: 내 기기로 하나
create or replace function public.push_test() returns int language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  select count(*) into n from public.push_subs where user_id = (select auth.uid());
  if n = 0 then raise exception 'no_device'; end if;
  update public.push_subs set kinds = case when 'test' = any (kinds) then kinds else kinds || '{test}' end where user_id = (select auth.uid());
  perform private.push(array[(select auth.uid())], 'test', '학원지원센터 알림', '이 기기로 알림이 잘 와요 👍', '/app#settings', 'test');
  return n;
end $$;
grant execute on function public.push_test() to authenticated;

-- 3) 온라인 카드 결제 (학원마다 꺼짐 · 테스트 · 실제 — 실제는 학원이 결제 회사와 계약한 뒤 센터가 켜요)
alter table public.academies add column if not exists online_pay text not null default 'off' check (online_pay in ('off', 'test', 'live'));
create or replace function public.set_online_pay(p_academy uuid, p_mode text)
returns text language plpgsql security definer set search_path = ''
as $$
begin
  if p_mode not in ('off', 'test', 'live') then raise exception 'bad_mode'; end if;
  if p_mode = 'live' and not private.is_center_admin() then raise exception 'center_only'; end if;
  if not (private.academy_role(p_academy) = 'owner' or private.is_center_admin()) then raise exception 'owner_only'; end if;
  update public.academies set online_pay = p_mode where id = p_academy;
  return p_mode;
end $$;
grant execute on function public.set_online_pay(uuid, text) to authenticated;

create table if not exists public.pay_orders (
  id text primary key check (id ~ '^asc_[A-Za-z0-9_-]{6,60}$'),
  academy_id uuid not null references public.academies(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  user_id uuid not null default auth.uid(),
  payer_name text,
  title text,
  amount integer not null check (amount between 100 and 100000000),
  test boolean not null default true,
  status text not null default 'ready' check (status in ('ready', 'done', 'fail', 'cancel')),
  payment_key text,
  method text,
  fail_msg text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
alter table public.pay_orders enable row level security;
create policy "내 결제 · 학원 수납 권한" on public.pay_orders for select to authenticated
  using (user_id = (select auth.uid()) or private.can_do(academy_id, 'billing'));
grant select on public.pay_orders to authenticated;
create index if not exists pay_orders_acad on public.pay_orders(academy_id, created_at desc);
-- 결제가 끝나면 원장 + 수납 권한에게 알림 (pay-online 함수가 서비스 키로 불러요)
create or replace function public.pay_order_notify(p_order text) returns void language plpgsql security definer set search_path = ''
as $$
declare o record;
begin
  select * into o from public.pay_orders where id = p_order and status = 'done';
  if o.id is null then return; end if;
  perform private.push(private.staff_with(o.academy_id, 'billing'), 'pay', case when o.test then '[테스트] ' else '' end || '온라인 결제 · ' || coalesce(o.payer_name, ''),
    coalesce(o.title, '수강료') || ' ' || to_char(o.amount, 'FM999,999,999') || '원' || case when o.test then ' (실제 돈은 나가지 않았어요)' else ' · 납부 확인됐어요' end, '/app#admin/billing', 'order-' || o.id);
end $$;
revoke all on function public.pay_order_notify(text) from public, anon, authenticated;
grant execute on function public.pay_order_notify(text) to service_role;

-- 4) 대량이체: 받는 사람 계좌 (원천세 · 재정 권한, 이름마다 한 줄)
create table if not exists public.payee_accounts (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  bank text check (char_length(bank) <= 30),
  account text check (char_length(account) <= 40),
  holder text check (char_length(holder) <= 50),
  updated_at timestamptz not null default now(),
  unique (academy_id, name)
);
alter table public.payee_accounts enable row level security;
create policy "이체 계좌 보기" on public.payee_accounts for select to authenticated using (private.can_do(academy_id, 'payroll') or private.can_do(academy_id, 'finance'));
create policy "이체 계좌 넣기" on public.payee_accounts for insert to authenticated with check (private.can_do(academy_id, 'payroll') or private.can_do(academy_id, 'finance'));
create policy "이체 계좌 고치기" on public.payee_accounts for update to authenticated using (private.can_do(academy_id, 'payroll') or private.can_do(academy_id, 'finance'));
create policy "이체 계좌 지우기" on public.payee_accounts for delete to authenticated using (private.can_do(academy_id, 'payroll') or private.can_do(academy_id, 'finance'));
grant select, delete on public.payee_accounts to authenticated;
grant insert (academy_id, name, bank, account, holder, updated_at) on public.payee_accounts to authenticated;
grant update (academy_id, name, bank, account, holder, updated_at) on public.payee_accounts to authenticated; -- 넣기 · 고치기를 한 번에(upsert) 하려면 모든 칸이 필요해요

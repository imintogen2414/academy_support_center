-- 학부모 수강료 내기 · 센터 관리자 회원 보기
-- 1) 학원 입금 계좌: 원장이 설정에서 넣고, 학원 사람(학부모 포함)은 학원 표를 읽을 때 함께 봐요
alter table public.academies
  add column pay_bank text check (char_length(pay_bank) <= 30),
  add column pay_account text check (char_length(pay_account) <= 40),
  add column pay_holder text check (char_length(pay_holder) <= 30),
  add column pay_note text check (char_length(pay_note) <= 200);
grant update (pay_bank, pay_account, pay_holder, pay_note) on public.academies to authenticated; -- 고치기는 원장만(정책 그대로)

-- 2) 학부모가 "보냈어요"라고 알린 시각 · 메모. 납부 확인(paid_at)은 그대로 원장이 해요
alter table public.invoices
  add column reported_at timestamptz,
  add column reported_note text check (char_length(reported_note) <= 100);

-- 연결된 아이 청구를 볼 때 "보냈어요" 알림도 함께
drop function public.my_child_invoices();
create function public.my_child_invoices()
returns table(id uuid, student_id uuid, student_name text, month text, title text, amount integer, due date, paid_at date, method text, reported_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.student_id, i.student_name, i.month, i.title, i.amount, i.due, i.paid_at, i.method, i.reported_at
  from public.invoices i
  join public.student_links l on l.student_id = i.student_id and l.user_id = (select auth.uid())
  where private.academy_role(i.academy_id) = 'parent'
  order by i.month desc, i.created_at;
$$;
revoke execute on function public.my_child_invoices() from public, anon;
grant execute on function public.my_child_invoices() to authenticated;

-- 학부모: 연결된 아이의 아직 확인 안 된 청구에 "보냈어요" (p_cancel이면 알림 취소)
create function public.report_invoice_paid(p_invoice uuid, p_note text default null, p_cancel boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invoices i
     set reported_at = case when p_cancel then null else now() end,
         reported_note = case when p_cancel then null else left(nullif(trim(coalesce(p_note, '')), ''), 100) end
   where i.id = p_invoice and i.paid_at is null
     and private.academy_role(i.academy_id) = 'parent'
     and exists (select 1 from public.student_links l where l.student_id = i.student_id and l.user_id = (select auth.uid()));
  if not found then raise exception 'not_allowed'; end if;
end;
$$;
revoke execute on function public.report_invoice_paid(uuid, text, boolean) from public, anon;
grant execute on function public.report_invoice_paid(uuid, text, boolean) to authenticated;

-- 3) 센터 관리자: 가입한 회원 목록 (이름 · 아이디 · 이메일 · 로그인 방법 · 역할 · 휴대폰 · 학원 · 가입일 · 마지막 로그인)
create function public.admin_members()
returns table(id uuid, name text, username text, email text, provider text, role text, phone text, academies text,
  created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean)
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
    exists (select 1 from public.center_admins c where lower(c.email) = lower(u.email))
  from public.profiles p
  join auth.users u on u.id = p.id
  where private.is_center_admin()
  order by u.created_at desc;
$$;
revoke execute on function public.admin_members() from public, anon;
grant execute on function public.admin_members() to authenticated;

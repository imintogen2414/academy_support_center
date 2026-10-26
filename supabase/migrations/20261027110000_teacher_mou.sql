-- 강사도 제휴(MOU)를 보고 신청할 수 있어요. 강사가 신청하면 먼저 원장 확인(owner_review) → 원장이 승인하면 센터로(new).
-- 유학 상담도 강사가 학부모 대신 신청할 수 있고, 원장이 확인해서 센터로 넘겨요(기존 흐름 그대로).

/* ---------- 제휴 신청 ---------- */
alter table public.partner_applications drop constraint partner_applications_status_check;
alter table public.partner_applications add constraint partner_applications_status_check
  check (status in ('owner_review', 'new', 'contacted', 'connected', 'closed'));
alter table public.partner_applications
  add column requested_by uuid references auth.users (id) on delete set null,
  add column requester_name text,
  add column requester_role text,
  add column owner_comment text check (char_length(owner_comment) <= 500);

create function private.fill_partner_requester()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  new.requested_by := uid;
  new.requester_name := (select coalesce(p.name, p.username) from public.profiles p where p.id = uid);
  new.requester_role := (select m.role from public.academy_members m where m.user_id = uid and m.academy_id = new.academy_id);
  new.status := case when new.requester_role = 'teacher' then 'owner_review' else 'new' end;
  return new;
end;
$$;
revoke execute on function private.fill_partner_requester() from public, anon, authenticated;
create trigger partner_applications_requester before insert on public.partner_applications
  for each row execute function private.fill_partner_requester();

drop policy "원장은 우리 신청을, 관리자는 전부 볼 수 있음" on public.partner_applications;
drop policy "원장이 제휴를 신청" on public.partner_applications;
drop policy "관리자가 제휴 신청을 처리" on public.partner_applications;
drop policy "원장은 확인 전 신청을 취소" on public.partner_applications;
create policy "제휴 보기: 원장 · 신청한 강사 · 관리자(원장 확인 뒤)" on public.partner_applications for select to authenticated
  using (private.academy_role(academy_id) = 'owner' or requested_by = (select auth.uid())
         or (private.is_center_admin() and status <> 'owner_review'));
create policy "제휴 신청: 원장 · 강사" on public.partner_applications for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "제휴 처리: 관리자(원장 확인 뒤)" on public.partner_applications for update to authenticated
  using (private.is_center_admin() and status <> 'owner_review') with check (private.is_center_admin() and status <> 'owner_review');
create policy "제휴 취소: 확인 전에만" on public.partner_applications for delete to authenticated
  using ((private.academy_role(academy_id) = 'owner' and status in ('owner_review', 'new'))
         or (requested_by = (select auth.uid()) and status = 'owner_review'));

-- 원장: 강사 제휴 신청 승인(센터로 보내기) · 반려
create function public.decide_partner_request(p_id uuid, p_ok boolean, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r public.partner_applications;
begin
  select * into r from public.partner_applications where id = p_id;
  if r.id is null or private.academy_role(r.academy_id) is distinct from 'owner' then raise exception 'not_allowed'; end if;
  if r.status <> 'owner_review' then raise exception 'already_decided'; end if;
  update public.partner_applications
    set status = case when p_ok then 'new' else 'closed' end, owner_comment = coalesce(nullif(left(trim(coalesce(p_comment, '')), 500), ''), case when p_ok then null else '원장님이 반려했어요' end)
    where id = p_id;
end;
$$;
revoke execute on function public.decide_partner_request(uuid, boolean, text) from public, anon;
grant execute on function public.decide_partner_request(uuid, boolean, text) to authenticated;

/* ---------- 유학 상담: 강사가 학부모 대신 신청 ---------- */
alter table public.abroad_requests add column via_name text, add column via_role text;
create or replace function private.abroad_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare r text := private.academy_role(new.academy_id);
begin
  if new.promo_id is not null and (select academy_id from public.abroad_promos where id = new.promo_id) is distinct from new.academy_id then
    raise exception 'promo_mismatch';
  end if;
  new.academy_name := (select name from public.academies where id = new.academy_id);
  if r in ('teacher', 'owner') then
    new.via_role := r;
    new.via_name := (select coalesce(p.name, p.username) from public.profiles p where p.id = (select auth.uid()));
  end if;
  return new;
end;
$$;
drop policy "우리 학원 학부모·학생(원장도 대신) 신청" on public.abroad_requests;
create policy "유학 상담 신청: 가족 · 원장 · 강사(대신)" on public.abroad_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and private.academy_role(academy_id) in ('parent', 'student', 'owner', 'teacher'));

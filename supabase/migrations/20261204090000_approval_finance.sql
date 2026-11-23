-- 결재 안에서 재정까지: 경비 상환 · 선지급(가지급) → 승인 → 지급 완료(통장 · 방법) → 선지급은 정산(실제 쓴 돈 · 영수증)
-- 영수증 · 견적서 파일, 쓴 날 · 지출 항목, 받을 계좌를 결재와 함께 남기고, 지급하면 재정 지출에도 그 통장 · 날짜로 들어가요.

alter table public.approvals drop constraint if exists approvals_kind_check;
alter table public.approvals add constraint approvals_kind_check
  check (kind in ('물품 구입', '재정 지출', '경비 상환', '선지급', '기타'));

alter table public.approvals
  add column if not exists category text check (char_length(category) <= 20),
  add column if not exists spent_on date,
  add column if not exists pay_to text check (char_length(pay_to) <= 100),
  add column if not exists files jsonb not null default '[]'::jsonb,
  add column if not exists paid_at timestamptz,
  add column if not exists paid_on date,
  add column if not exists paid_by_name text,
  add column if not exists paid_account_id uuid references public.fin_accounts (id) on delete set null,
  add column if not exists pay_method text check (char_length(pay_method) <= 20),
  add column if not exists used_amount integer check (used_amount between 0 and 1000000000),
  add column if not exists settle_note text check (char_length(settle_note) <= 500),
  add column if not exists settled_at timestamptz;
alter table public.approvals drop constraint if exists approvals_files_check;
alter table public.approvals add constraint approvals_files_check check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 10);

grant insert (category, spent_on, pay_to, files) on public.approvals to authenticated;
grant update (category, spent_on, pay_to, files) on public.approvals to authenticated;

-- 영수증 · 견적서 파일 (비공개): 학원/올린 사람/… — 올린 사람과 결재 처리 권한이 있는 사람만 봐요
insert into storage.buckets (id, name, public, file_size_limit)
values ('approvals', 'approvals', false, 20971520) on conflict (id) do nothing;
drop policy if exists "결재 파일 읽기" on storage.objects;
drop policy if exists "결재 파일 올리기" on storage.objects;
drop policy if exists "결재 파일 지우기" on storage.objects;
create policy "결재 파일 읽기" on storage.objects for select to authenticated using (
  bucket_id = 'approvals' and (
    private.can_do(private.path_uuid(name), 'approvals')
    or ((storage.foldername(name))[2] = (select auth.uid())::text and private.academy_role(private.path_uuid(name)) is not null)));
create policy "결재 파일 올리기" on storage.objects for insert to authenticated with check (
  bucket_id = 'approvals' and (storage.foldername(name))[2] = (select auth.uid())::text
  and private.academy_role(private.path_uuid(name)) in ('owner', 'teacher'));
create policy "결재 파일 지우기" on storage.objects for delete to authenticated using (
  bucket_id = 'approvals' and (storage.foldername(name))[2] = (select auth.uid())::text
  and private.academy_role(private.path_uuid(name)) in ('owner', 'teacher'));

-- 승인: 지출 날짜는 쓴 날(없으면 오늘)
create or replace function public.decide_approval(p_id uuid, p_ok boolean, p_comment text, p_category text)
returns void language plpgsql security definer set search_path = '' as $$
declare a record; eid uuid; who text; r text;
begin
  select * into a from public.approvals where id = p_id for update;
  if not found or not private.can_do(a.academy_id, 'approvals') then raise exception 'owner_only'; end if;
  r := private.academy_role(a.academy_id);
  if a.requested_by = (select auth.uid()) and r <> 'owner' then raise exception 'own_request'; end if;
  if a.status <> 'pending' then raise exception 'not_pending'; end if;
  select coalesce(p.name, p.username) into who from public.profiles p where p.id = (select auth.uid());
  if p_ok and nullif(trim(coalesce(p_category, '')), '') is not null and coalesce(a.amount, 0) > 0
     and private.can_do(a.academy_id, 'finance') then
    insert into public.expenses (academy_id, day, category, amount, memo)
      values (a.academy_id, coalesce(a.spent_on, current_date), left(trim(p_category), 20), a.amount,
              left(format('결재: %s (%s)', a.title, coalesce(a.requester_name, '강사')), 200))
      returning id into eid;
  end if;
  update public.approvals
    set status = case when p_ok then 'approved' else 'rejected' end,
        owner_comment = nullif(left(trim(coalesce(p_comment, '')), 500), ''),
        decided_by = (select auth.uid()), decided_at = now(), expense_id = eid,
        decided_by_name = who, decided_by_role = r,
        category = coalesce(nullif(left(trim(coalesce(p_category, '')), 20), ''), a.category)
    where id = p_id;
end $$;

-- 지급 완료 표시 (원장 · 결재 처리 권한): 날짜 · 통장 · 방법. 재정 지출이 없으면 이때 만들어요(재정 권한), 있으면 통장 · 날짜를 맞춰요
create or replace function public.mark_approval_paid(p_id uuid, p_paid boolean, p_day date, p_account uuid, p_method text)
returns void language plpgsql security definer set search_path = '' as $$
declare a record; who text; eid uuid;
begin
  select * into a from public.approvals where id = p_id for update;
  if not found or not private.can_do(a.academy_id, 'approvals') then raise exception 'owner_only'; end if;
  if a.status <> 'approved' then raise exception 'not_approved'; end if;
  if p_account is not null and not exists (select 1 from public.fin_accounts where id = p_account and academy_id = a.academy_id) then raise exception 'bad_account'; end if;
  if not p_paid then
    update public.approvals set paid_at = null, paid_on = null, paid_by_name = null, paid_account_id = null, pay_method = null where id = p_id;
    return;
  end if;
  select coalesce(p.name, p.username) into who from public.profiles p where p.id = (select auth.uid());
  eid := a.expense_id;
  if private.can_do(a.academy_id, 'finance') and coalesce(a.amount, 0) > 0 then
    if eid is null then
      insert into public.expenses (academy_id, day, category, amount, memo, account_id)
        values (a.academy_id, coalesce(p_day, current_date), coalesce(nullif(a.category, ''), '기타'), coalesce(a.used_amount, a.amount),
                left(format('결재: %s (%s)', a.title, coalesce(a.requester_name, '강사')), 200), p_account)
        returning id into eid;
    else
      update public.expenses set account_id = coalesce(p_account, account_id), day = coalesce(p_day, day) where id = eid;
    end if;
  end if;
  update public.approvals set paid_at = now(), paid_on = coalesce(p_day, current_date), paid_by_name = who,
    paid_account_id = p_account, pay_method = nullif(left(trim(coalesce(p_method, '')), 20), ''), expense_id = eid
  where id = p_id;
end $$;
revoke execute on function public.mark_approval_paid(uuid, boolean, date, uuid, text) from public, anon;
grant execute on function public.mark_approval_paid(uuid, boolean, date, uuid, text) to authenticated;

-- 선지급 정산 (올린 사람 또는 결재 처리 권한): 실제 쓴 돈 · 메모 · 영수증. 재정 지출 금액도 실제 쓴 돈으로
create or replace function public.settle_approval(p_id uuid, p_used integer, p_note text, p_files jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  select * into a from public.approvals where id = p_id for update;
  if not found or not (a.requested_by = (select auth.uid()) or private.can_do(a.academy_id, 'approvals')) then raise exception 'not_allowed'; end if;
  if a.kind <> '선지급' or a.status <> 'approved' or a.paid_at is null then raise exception 'not_paid'; end if;
  if p_used is null or p_used < 0 or p_used > 1000000000 then raise exception 'bad_amount'; end if;
  if p_files is not null and (jsonb_typeof(p_files) <> 'array' or jsonb_array_length(p_files) > 10) then raise exception 'bad_files'; end if;
  update public.approvals set used_amount = p_used, settle_note = nullif(left(trim(coalesce(p_note, '')), 500), ''),
    settled_at = now(), files = coalesce(p_files, files)
  where id = p_id;
  if a.expense_id is not null then update public.expenses set amount = p_used where id = a.expense_id; end if;
end $$;
revoke execute on function public.settle_approval(uuid, integer, text, jsonb) from public, anon;
grant execute on function public.settle_approval(uuid, integer, text, jsonb) to authenticated;

-- 고치기: 새 종류 · 항목 · 쓴 날 · 받을 계좌도
drop function if exists public.edit_approval(uuid, text, text, integer, text, date, text);
create or replace function public.edit_approval(p_id uuid, p_kind text, p_title text, p_amount integer, p_detail text, p_want_by date, p_comment text,
  p_category text default null, p_spent_on date default null, p_pay_to text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare a record; who text;
begin
  select * into a from public.approvals where id = p_id for update;
  if not found or not private.can_do(a.academy_id, 'approvals') then raise exception 'owner_only'; end if;
  if nullif(trim(coalesce(p_title, '')), '') is null then raise exception 'title_required'; end if;
  if p_amount is not null and p_amount < 0 then raise exception 'bad_amount'; end if;
  if p_kind not in ('물품 구입', '재정 지출', '경비 상환', '선지급', '기타') then raise exception 'bad_kind'; end if;
  select coalesce(p.name, p.username) into who from public.profiles p where p.id = (select auth.uid());
  update public.approvals set kind = p_kind, title = left(trim(p_title), 100), amount = p_amount,
    detail = nullif(left(trim(coalesce(p_detail, '')), 2000), ''), want_by = p_want_by,
    owner_comment = case when a.status = 'pending' then a.owner_comment else nullif(left(trim(coalesce(p_comment, '')), 500), '') end,
    category = nullif(left(trim(coalesce(p_category, '')), 20), ''), spent_on = p_spent_on,
    pay_to = nullif(left(trim(coalesce(p_pay_to, '')), 100), ''),
    edited_at = now(), edited_by_name = who
  where id = p_id;
  if a.expense_id is not null and private.can_do(a.academy_id, 'finance') then
    update public.expenses set amount = coalesce(a.used_amount, p_amount, 0),
      category = coalesce(nullif(left(trim(coalesce(p_category, '')), 20), ''), category),
      memo = left(format('결재: %s (%s)', trim(p_title), coalesce(a.requester_name, '강사')), 200)
    where id = a.expense_id;
  end if;
end $$;
revoke execute on function public.edit_approval(uuid, text, text, integer, text, date, text, text, date, text) from public, anon;
grant execute on function public.edit_approval(uuid, text, text, integer, text, date, text, text, date, text) to authenticated;

-- 올린 사람에게 휴대폰 알림: 승인 · 반려 · 지급 완료
create or replace function private.push_approval_done() returns trigger language plpgsql security definer set search_path = '' as $$
declare u text := case when new.requester_role = 'owner' then '/app#admin/approvals' else '/app#approvals' end;
begin
  if new.requested_by is null or new.requested_by = new.decided_by then return null; end if;
  if old.status = 'pending' and new.status <> 'pending' then
    perform private.push(array[new.requested_by], 'approval', case when new.status = 'approved' then '결재 승인' else '결재 반려' end || ' · ' || new.title,
      coalesce(new.decided_by_name, '원장') || coalesce(' · ' || new.owner_comment, ''), u, 'apv-' || new.id);
  elsif old.paid_at is null and new.paid_at is not null then
    perform private.push(array[new.requested_by], 'approval', '지급 완료 · ' || new.title,
      coalesce(to_char(new.amount, 'FM999,999,999') || '원 · ', '') || coalesce(new.pay_method, '') , u, 'apv-' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists push_approval_done on public.approvals;
create trigger push_approval_done after update on public.approvals for each row execute function private.push_approval_done();

-- 되돌리기 기록에도
drop trigger if exists zz_change_log on public.approvals;
create trigger zz_change_log after insert or update or delete on public.approvals for each row execute function private.log_change();

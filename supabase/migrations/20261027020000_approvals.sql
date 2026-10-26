-- 11단계: 결재 — 강사가 물품 · 재정 지출을 올리면 원장이 승인 · 반려
-- 승인하면서 "지출에 바로 넣기"를 고르면 재정(expenses)에 저절로 들어가요.
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  requested_by uuid references auth.users (id) on delete set null,
  requester_name text,
  kind text not null default '물품 구입' check (kind in ('물품 구입', '재정 지출', '기타')),
  title text not null check (char_length(title) between 1 and 100),
  amount integer check (amount between 0 and 1000000000), -- 원
  detail text check (char_length(detail) <= 2000),
  want_by date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  owner_comment text check (char_length(owner_comment) <= 500),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  expense_id uuid references public.expenses (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index approvals_academy_idx on public.approvals (academy_id, status);
comment on table public.approvals is '결재 (강사 → 원장)';

-- 올린 사람은 넣을 때 저절로
create function private.fill_approval_requester()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.requested_by := (select auth.uid());
  select coalesce(p.name, p.username) into new.requester_name from public.profiles p where p.id = new.requested_by;
  return new;
end;
$$;
revoke execute on function private.fill_approval_requester() from public, anon, authenticated;
create trigger approvals_requester before insert on public.approvals
  for each row execute function private.fill_approval_requester();
create trigger approvals_touch before update on public.approvals
  for each row execute function private.touch_updated_at();

alter table public.approvals enable row level security;
create policy "올린 사람과 원장이 볼 수 있음" on public.approvals for select to authenticated
  using (requested_by = (select auth.uid()) or private.academy_role(academy_id) = 'owner');
create policy "강사·원장이 결재를 올림" on public.approvals for insert to authenticated
  with check (private.academy_role(academy_id) in ('teacher', 'owner'));
create policy "올린 사람은 기다리는 동안 고침" on public.approvals for update to authenticated
  using (requested_by = (select auth.uid()) and status = 'pending')
  with check (requested_by = (select auth.uid()) and status = 'pending');
create policy "올린 사람은 기다리는 동안 취소" on public.approvals for delete to authenticated
  using (requested_by = (select auth.uid()) and status = 'pending');

revoke all on public.approvals from anon, authenticated;
grant select, delete on public.approvals to authenticated;
grant insert (academy_id, kind, title, amount, detail, want_by) on public.approvals to authenticated;
grant update (kind, title, amount, detail, want_by) on public.approvals to authenticated;

-- 원장: 승인(p_ok) · 반려. 승인하면서 p_category를 넣으면 그 항목으로 오늘 날짜 지출을 만들어요.
create function public.decide_approval(p_id uuid, p_ok boolean, p_comment text, p_category text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare a record; eid uuid;
begin
  select * into a from public.approvals where id = p_id for update;
  if not found or private.academy_role(a.academy_id) is distinct from 'owner' then raise exception 'owner_only'; end if;
  if a.status <> 'pending' then raise exception 'not_pending'; end if;
  if p_ok and nullif(trim(coalesce(p_category, '')), '') is not null and coalesce(a.amount, 0) > 0 then
    insert into public.expenses (academy_id, day, category, amount, memo)
      values (a.academy_id, current_date, left(trim(p_category), 20), a.amount,
              left(format('결재: %s (%s)', a.title, coalesce(a.requester_name, '강사')), 200))
      returning id into eid;
  end if;
  update public.approvals
    set status = case when p_ok then 'approved' else 'rejected' end,
        owner_comment = nullif(left(trim(coalesce(p_comment, '')), 500), ''),
        decided_by = (select auth.uid()), decided_at = now(), expense_id = eid
    where id = p_id;
end;
$$;
revoke execute on function public.decide_approval(uuid, boolean, text, text) from public, anon;
grant execute on function public.decide_approval(uuid, boolean, text, text) to authenticated;

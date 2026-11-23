-- 결재: 원장님도 올리고 · 처리하고, 누가 올렸고(역할까지) 누가 결재했는지 남겨요
alter table public.approvals
  add column if not exists requester_role text,
  add column if not exists decided_by_name text,
  add column if not exists decided_by_role text;

-- 올린 사람 이름 + 그 학원에서의 역할(원장 · 강사)은 넣을 때 저절로
create or replace function private.fill_approval_requester()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.requested_by := (select auth.uid());
  select coalesce(p.name, p.username) into new.requester_name from public.profiles p where p.id = new.requested_by;
  new.requester_role := private.academy_role(new.academy_id);
  return new;
end $$;
revoke execute on function private.fill_approval_requester() from public, anon, authenticated;

-- 결재한 사람 이름 · 역할도 남겨요 (원장은 자기가 올린 것도 처리할 수 있어요 — 원장이 여러 명이면 다른 원장님이)
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
      values (a.academy_id, current_date, left(trim(p_category), 20), a.amount,
              left(format('결재: %s (%s)', a.title, coalesce(a.requester_name, '강사')), 200))
      returning id into eid;
  end if;
  update public.approvals
    set status = case when p_ok then 'approved' else 'rejected' end,
        owner_comment = nullif(left(trim(coalesce(p_comment, '')), 500), ''),
        decided_by = (select auth.uid()), decided_at = now(), expense_id = eid,
        decided_by_name = who, decided_by_role = r
    where id = p_id;
end $$;
revoke execute on function public.decide_approval(uuid, boolean, text, text) from public, anon;
grant execute on function public.decide_approval(uuid, boolean, text, text) to authenticated;

-- 이미 있는 결재도 채워 두기
update public.approvals a set requester_role = m.role
from public.academy_members m where m.academy_id = a.academy_id and m.user_id = a.requested_by and a.requester_role is null;
update public.approvals a set decided_by_name = coalesce(p.name, p.username)
from public.profiles p where p.id = a.decided_by and a.decided_by_name is null;
update public.approvals a set decided_by_role = m.role
from public.academy_members m where m.academy_id = a.academy_id and m.user_id = a.decided_by and a.decided_by_role is null;

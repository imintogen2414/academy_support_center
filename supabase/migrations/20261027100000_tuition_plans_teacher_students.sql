-- 수강료 미리 정해 두기 + 강사도 원생 추가 · 수정
-- 원장이 "초등 주 3회 300,000원"처럼 수강료를 정해 두고 학생에게 붙이면, 청구서를 만들 때 그 금액이 저절로 들어가요.
-- 강사도 원생을 추가 · 수정할 수 있어요(삭제는 원장만). 누가 추가했는지 남겨서 원장이 볼 수 있어요.

create table public.tuition_plans (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  amount integer not null check (amount between 0 and 100000000),
  class_name text check (char_length(class_name) <= 50), -- 이 반 학생에게 주로 쓰는 수강료 (비워도 돼요)
  memo text check (char_length(memo) <= 200),
  created_at timestamptz not null default now()
);
create index tuition_plans_academy_idx on public.tuition_plans (academy_id);
comment on table public.tuition_plans is '미리 정해 둔 수강료 (원장 쓰기, 원장 · 강사 읽기)';
alter table public.tuition_plans enable row level security;
create policy "수강료: 원장 · 강사 보기" on public.tuition_plans for select to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "수강료: 원장 넣기" on public.tuition_plans for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "수강료: 원장 고치기" on public.tuition_plans for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "수강료: 원장 지우기" on public.tuition_plans for delete to authenticated
  using (private.academy_role(academy_id) = 'owner');
revoke all on public.tuition_plans from anon, authenticated;
grant select, delete on public.tuition_plans to authenticated;
grant insert (academy_id, name, amount, class_name, memo) on public.tuition_plans to authenticated;
grant update (name, amount, class_name, memo) on public.tuition_plans to authenticated;

-- 원생: 수강료 · 추가한 사람
alter table public.students
  add column tuition_plan_id uuid references public.tuition_plans (id) on delete set null,
  add column added_by uuid references auth.users (id) on delete set null,
  add column added_by_name text,
  add column added_by_role text;

create function private.fill_student()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if new.tuition_plan_id is not null and not exists (
    select 1 from public.tuition_plans p where p.id = new.tuition_plan_id and p.academy_id = new.academy_id) then
    raise exception 'plan_not_in_academy';
  end if;
  if tg_op = 'INSERT' and uid is not null then
    new.added_by := uid;
    new.added_by_name := (select coalesce(p.name, p.username) from public.profiles p where p.id = uid);
    new.added_by_role := (select m.role from public.academy_members m where m.user_id = uid and m.academy_id = new.academy_id);
  end if;
  return new;
end;
$$;
revoke execute on function private.fill_student() from public, anon, authenticated;
create trigger students_fill before insert or update on public.students for each row execute function private.fill_student();

drop policy "원장만 원생을 추가" on public.students;
drop policy "원장만 원생을 고침" on public.students;
create policy "원장·강사가 원생을 추가" on public.students for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장·강사가 원생을 고침" on public.students for update to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher')) with check (private.academy_role(academy_id) in ('owner', 'teacher'));
grant insert (tuition_plan_id) on public.students to authenticated;
grant update (tuition_plan_id) on public.students to authenticated;

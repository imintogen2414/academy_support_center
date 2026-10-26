-- 13단계: 학생 오늘 할 일 — 학원(원장 · 강사)과 부모님이 정해 주고, 학생이 체크해요.
create table public.student_todos (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  day date not null default current_date,
  title text not null check (char_length(title) between 1 and 100),
  created_by uuid references auth.users (id) on delete set null,
  creator_name text,
  creator_role text check (creator_role in ('owner', 'teacher', 'parent', 'student')),
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index student_todos_student_day_idx on public.student_todos (student_id, day);
create index student_todos_academy_day_idx on public.student_todos (academy_id, day);
comment on table public.student_todos is '학생 할 일 (학원 · 부모님이 정하고 학생이 체크)';

-- 만든 사람 · 역할은 넣을 때 저절로, 원생의 학원과 맞는지도 확인
create function private.fill_todo_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.students s where s.id = new.student_id and s.academy_id = new.academy_id) then
    raise exception 'student_mismatch';
  end if;
  new.created_by := (select auth.uid());
  new.creator_role := private.academy_role(new.academy_id);
  select coalesce(p.name, p.username) into new.creator_name from public.profiles p where p.id = new.created_by;
  new.done_at := null;
  return new;
end;
$$;
revoke execute on function private.fill_todo_creator() from public, anon, authenticated;
create trigger student_todos_creator before insert on public.student_todos
  for each row execute function private.fill_todo_creator();

alter table public.student_todos enable row level security;
create policy "학원 사람과 연결된 가족이 볼 수 있음" on public.student_todos for select to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher') or private.is_my_child(student_id));
create policy "원장·강사·학부모·학생이 할 일을 넣음" on public.student_todos for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher')
              or (private.academy_role(academy_id) in ('parent', 'student') and private.is_my_child(student_id)));
create policy "만든 사람이 고침" on public.student_todos for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "만든 사람과 원장이 지움" on public.student_todos for delete to authenticated
  using (created_by = (select auth.uid()) or private.academy_role(academy_id) = 'owner');

revoke all on public.student_todos from anon, authenticated;
grant select, delete on public.student_todos to authenticated;
grant insert (academy_id, student_id, day, title) on public.student_todos to authenticated;
grant update (day, title) on public.student_todos to authenticated;

-- 다 했어요 체크 · 풀기: 학생 본인 · 학부모 · 학원 사람
create function public.check_todo(p_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare t record;
begin
  select * into t from public.student_todos where id = p_id;
  if not found or not (private.academy_role(t.academy_id) in ('owner', 'teacher') or private.is_my_child(t.student_id)) then
    raise exception 'not_allowed';
  end if;
  update public.student_todos set done_at = case when p_done then now() else null end where id = p_id;
end;
$$;
revoke execute on function public.check_todo(uuid, boolean) from public, anon;
grant execute on function public.check_todo(uuid, boolean) to authenticated;

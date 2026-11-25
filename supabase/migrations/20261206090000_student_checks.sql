-- 학생별 체크리스트: 학생마다 챙길 일(입학 서류 받기 · 교재 주기 · 학부모 앱 연결 …)을 적고 하나씩 체크해요 (원장 · 강사만)
--   반 학생 모두에게 같은 항목을 한 번에 넣을 수도 있어요(화면이 학생마다 한 줄씩 넣어요).
--   볼 수 있는 학생만(private.can_see_student). 체크는 볼 수 있는 원장 · 강사 누구나, 지우기는 넣은 사람이나 원장.
create table if not exists public.student_checks (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  due date,
  done boolean not null default false,
  done_at timestamptz, done_by_name text,
  by_id uuid default auth.uid(), by_name text,
  created_at timestamptz not null default now()
);
create index if not exists student_checks_stu on public.student_checks (student_id, created_at);
create index if not exists student_checks_acad on public.student_checks (academy_id);
alter table public.student_checks enable row level security;

drop policy if exists "체크리스트 보기" on public.student_checks;
drop policy if exists "체크리스트 쓰기" on public.student_checks;
drop policy if exists "체크리스트 체크" on public.student_checks;
drop policy if exists "체크리스트 지우기" on public.student_checks;
create policy "체크리스트 보기" on public.student_checks for select to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher') and private.can_see_student(student_id));
create policy "체크리스트 쓰기" on public.student_checks for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher') and private.can_see_student(student_id)
    and exists (select 1 from public.students s where s.id = student_id and s.academy_id = student_checks.academy_id));
create policy "체크리스트 체크" on public.student_checks for update to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher') and private.can_see_student(student_id))
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "체크리스트 지우기" on public.student_checks for delete to authenticated
  using (by_id = (select auth.uid()) or private.academy_role(academy_id) = 'owner');
revoke insert, update, delete on public.student_checks from authenticated;
grant select, delete on public.student_checks to authenticated;
grant insert (academy_id, student_id, title, due, done) on public.student_checks to authenticated;
grant update (title, due, done) on public.student_checks to authenticated;

-- 넣은 사람 · 체크한 사람은 트리거가
create or replace function private.student_check_stamp() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('asc.undo_of', true), '') <> '' then return new; end if; -- 되돌리기는 그때 모습 그대로
  if tg_op = 'INSERT' then
    new.by_id := (select auth.uid()); new.by_name := private.who_label(); new.created_at := now();
    if new.done then new.done_at := now(); new.done_by_name := new.by_name; else new.done_at := null; new.done_by_name := null; end if;
  else
    new.by_id := old.by_id; new.by_name := old.by_name; new.created_at := old.created_at;
    new.academy_id := old.academy_id; new.student_id := old.student_id;
    if new.done is distinct from old.done then
      if new.done then new.done_at := now(); new.done_by_name := private.who_label(); else new.done_at := null; new.done_by_name := null; end if;
    else
      new.done_at := old.done_at; new.done_by_name := old.done_by_name;
    end if;
  end if;
  return new;
end $$;
revoke execute on function private.student_check_stamp() from public, anon, authenticated;
drop trigger if exists student_check_stamp on public.student_checks;
create trigger student_check_stamp before insert or update on public.student_checks for each row execute function private.student_check_stamp();

-- 되돌리기 기록
drop trigger if exists zz_change_log on public.student_checks;
create trigger zz_change_log after insert or update or delete on public.student_checks for each row execute function private.log_change();

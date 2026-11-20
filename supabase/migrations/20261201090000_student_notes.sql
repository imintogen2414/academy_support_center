-- 원생 기록: 학생마다 특이사항 · 상담 기록이 날짜별로 쌓여요 (원장 · 강사만, 학부모 · 학생에게는 안 보여요)
--   kind: consult 학생 상담 · parent 학부모 상담 · study 학습 · life 생활 · 태도 · health 건강 · 안전 · memo 메모
--   pinned = 특이사항(알레르기 · 하원 방법 · 주의할 점처럼 늘 봐야 하는 것) — 학생 한 명 보기 맨 위 · 원생 명단에 표시
--   볼 수 있는 학생만(private.can_see_student: 원장은 전부, 강사는 담당 반 · 내가 넣은 학생 · "모든 원생" 권한)
create table if not exists public.student_notes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  kind text not null default 'memo' check (kind in ('consult', 'parent', 'study', 'life', 'health', 'memo')),
  day date not null default ((now() at time zone 'Asia/Seoul')::date),
  body text not null check (char_length(body) between 1 and 2000),
  pinned boolean not null default false,
  by_id uuid default auth.uid(), by_name text, by_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz, updated_by_name text
);
create index if not exists student_notes_stu on public.student_notes (student_id, day desc);
create index if not exists student_notes_acad on public.student_notes (academy_id, day desc);
alter table public.student_notes enable row level security;

drop policy if exists "원생 기록 보기" on public.student_notes;
drop policy if exists "원생 기록 쓰기" on public.student_notes;
drop policy if exists "원생 기록 고치기" on public.student_notes;
drop policy if exists "원생 기록 지우기" on public.student_notes;
create policy "원생 기록 보기" on public.student_notes for select to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher') and private.can_see_student(student_id));
create policy "원생 기록 쓰기" on public.student_notes for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher') and private.can_see_student(student_id)
    and exists (select 1 from public.students s where s.id = student_id and s.academy_id = student_notes.academy_id));
-- 고치기 · 지우기: 쓴 사람이나 원장
create policy "원생 기록 고치기" on public.student_notes for update to authenticated
  using (by_id = (select auth.uid()) or private.academy_role(academy_id) = 'owner')
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원생 기록 지우기" on public.student_notes for delete to authenticated
  using (by_id = (select auth.uid()) or private.academy_role(academy_id) = 'owner');
revoke insert, update, delete on public.student_notes from authenticated;
grant select, delete on public.student_notes to authenticated;
grant insert (academy_id, student_id, kind, day, body, pinned) on public.student_notes to authenticated;
grant update (kind, day, body, pinned) on public.student_notes to authenticated;

-- 쓴 사람 · 고친 사람은 트리거가 (화면이 보낸 값은 무시)
create or replace function private.student_note_stamp() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('asc.undo_of', true), '') <> '' then return new; end if; -- 되돌리기는 그때 모습 그대로
  if tg_op = 'INSERT' then
    new.by_id := (select auth.uid()); new.by_name := private.who_label(); new.by_role := private.academy_role(new.academy_id);
  else
    new.by_id := old.by_id; new.by_name := old.by_name; new.by_role := old.by_role; new.created_at := old.created_at;
    new.academy_id := old.academy_id; new.student_id := old.student_id;
    if (new.kind, new.day, new.body, new.pinned) is distinct from (old.kind, old.day, old.body, old.pinned) then
      new.updated_at := now(); new.updated_by_name := private.who_label();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists student_note_stamp on public.student_notes;
create trigger student_note_stamp before insert or update on public.student_notes for each row execute function private.student_note_stamp();

-- 되돌리기 기록
drop trigger if exists zz_change_log on public.student_notes;
create trigger zz_change_log after insert or update or delete on public.student_notes for each row execute function private.log_change();

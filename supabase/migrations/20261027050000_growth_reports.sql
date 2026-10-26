-- 14단계: 성장 리포트 — 원장 · 강사가 쓰고 "발급"하면 연결된 학부모 · 학생이 봐요.
-- stats(출결 · 할 일 수행)는 발급할 때 화면이 계산해서 같이 저장해요.
create table public.growth_reports (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  student_name text,
  class_name text,
  title text not null check (char_length(title) between 1 and 100),
  period_from date not null,
  period_to date not null,
  scores jsonb not null default '[]'::jsonb,   -- [{ subject, score, note }]
  ratings jsonb not null default '{}'::jsonb,  -- { 수업 태도: 1~5, … }
  strengths text check (char_length(strengths) <= 1000),
  improve text check (char_length(improve) <= 1000),
  comment text check (char_length(comment) <= 2000),
  goals text check (char_length(goals) <= 1000),
  stats jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'issued')),
  issued_at timestamptz,
  written_by uuid references auth.users (id) on delete set null default auth.uid(),
  writer_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_to >= period_from),
  check (jsonb_typeof(scores) = 'array' and jsonb_array_length(scores) <= 20),
  check (jsonb_typeof(ratings) = 'object' and jsonb_typeof(stats) = 'object')
);
create index growth_reports_academy_idx on public.growth_reports (academy_id, created_at desc);
create index growth_reports_student_idx on public.growth_reports (student_id);
comment on table public.growth_reports is '성장 리포트 (원장·강사 쓰기, 발급하면 연결된 가족이 보기)';

-- 학생 이름 · 반 · 쓴 사람은 저절로, 발급하면 발급 시각도
create function private.fill_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select s.name, s.class_name into new.student_name, new.class_name from public.students s
      where s.id = new.student_id and s.academy_id = new.academy_id;
    if not found then raise exception 'student_mismatch'; end if;
    select coalesce(p.name, p.username) into new.writer_name from public.profiles p where p.id = (select auth.uid());
  end if;
  if new.status = 'issued' and (tg_op = 'INSERT' or old.status <> 'issued') then new.issued_at := now(); end if;
  if new.status = 'draft' then new.issued_at := null; end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function private.fill_report() from public, anon, authenticated;
create trigger growth_reports_fill before insert or update on public.growth_reports
  for each row execute function private.fill_report();

alter table public.growth_reports enable row level security;
create policy "학원 사람은 전부, 가족은 발급된 우리 아이 것" on public.growth_reports for select to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher') or (status = 'issued' and private.is_my_child(student_id)));
create policy "원장·강사가 리포트를 씀" on public.growth_reports for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장·강사가 리포트를 고침" on public.growth_reports for update to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher')) with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장 또는 쓴 사람이 리포트를 지움" on public.growth_reports for delete to authenticated
  using (private.academy_role(academy_id) = 'owner' or (written_by = (select auth.uid()) and status = 'draft'));

revoke all on public.growth_reports from anon, authenticated;
grant select, delete on public.growth_reports to authenticated;
grant insert (academy_id, student_id, title, period_from, period_to, scores, ratings, strengths, improve, comment, goals, stats, status) on public.growth_reports to authenticated;
grant update (title, period_from, period_to, scores, ratings, strengths, improve, comment, goals, stats, status) on public.growth_reports to authenticated;

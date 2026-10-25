-- 4단계 테이블: 행정 지원 — 출결 · 수납·청구 · 지출(재정) · 서류·행정 마감
-- 출결은 원장·강사가, 돈과 서류는 원장만 다뤄요.

/* ---------- 출결: 학생 · 날짜마다 한 줄 ---------- */
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  day date not null,
  status text not null check (status in ('present', 'late', 'absent', 'early')), -- 출석 · 지각 · 결석 · 조퇴
  checked_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, day)
);
create index attendance_academy_day_idx on public.attendance (academy_id, day);
comment on table public.attendance is '출결 (학생·날짜마다 한 줄, mark_attendance로 입력)';

alter table public.attendance enable row level security;
create policy "원장·강사는 출결을 볼 수 있음" on public.attendance for select to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher'));
revoke all on public.attendance from anon, authenticated;
grant select on public.attendance to authenticated;

-- 여러 학생을 한 번에 출결 처리 (p_status가 null이면 입력 취소)
create function public.mark_attendance(p_students uuid[], p_day date, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  if p_status is not null and p_status not in ('present', 'late', 'absent', 'early') then raise exception 'bad_status'; end if;
  if p_day is null or cardinality(p_students) is null or cardinality(p_students) > 500 then raise exception 'bad_input'; end if;
  if exists (
    select 1 from unnest(p_students) as u(sid)
    left join public.students s on s.id = u.sid
    where s.id is null or coalesce(private.academy_role(s.academy_id), '') not in ('owner', 'teacher')
  ) then raise exception 'not_allowed'; end if;

  if p_status is null then
    delete from public.attendance where student_id = any (p_students) and day = p_day;
  else
    insert into public.attendance (academy_id, student_id, day, status, checked_by)
      select s.academy_id, s.id, p_day, p_status, (select auth.uid())
      from public.students s where s.id = any (p_students)
    on conflict (student_id, day) do update
      set status = excluded.status, checked_by = excluded.checked_by, updated_at = now();
  end if;
end;
$$;
revoke execute on function public.mark_attendance(uuid[], date, text) from public, anon;
grant execute on function public.mark_attendance(uuid[], date, text) to authenticated;

/* ---------- 수납·청구: 학생에게 보내는 청구 한 건 ---------- */
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  student_id uuid references public.students (id) on delete set null,
  student_name text not null check (char_length(student_name) between 1 and 50), -- 원생을 지워도 기록은 남도록
  class_name text check (char_length(class_name) <= 50),
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),  -- 청구 월 (예: 2026-10)
  title text not null default '수강료' check (char_length(title) between 1 and 50),
  amount integer not null check (amount between 0 and 100000000), -- 원
  due date,
  paid_at date,
  method text check (method in ('카드', '계좌이체', '현금', '기타')),
  memo text check (char_length(memo) <= 300),
  created_at timestamptz not null default now()
);
create index invoices_academy_month_idx on public.invoices (academy_id, month);
create index invoices_student_idx on public.invoices (student_id);
comment on table public.invoices is '수납·청구 (원장만)';

alter table public.invoices enable row level security;
create policy "원장만 청구를 볼 수 있음" on public.invoices for select to authenticated
  using (private.academy_role(academy_id) = 'owner');
create policy "원장만 청구를 추가" on public.invoices for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 청구를 고침" on public.invoices for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 청구를 삭제" on public.invoices for delete to authenticated
  using (private.academy_role(academy_id) = 'owner');

revoke all on public.invoices from anon, authenticated;
grant select, delete on public.invoices to authenticated;
grant insert (academy_id, student_id, month, title, amount, due, paid_at, method, memo) on public.invoices to authenticated;
grant update (title, amount, due, paid_at, method, memo) on public.invoices to authenticated;

-- 청구를 만들 때: 같은 학원 학생인지 확인하고 이름·반을 함께 적어 둬요
create function private.invoices_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare s record;
begin
  select academy_id, name, class_name into s from public.students where id = new.student_id;
  if not found or s.academy_id <> new.academy_id then raise exception 'student_mismatch'; end if;
  new.student_name := s.name;
  new.class_name := s.class_name;
  return new;
end;
$$;
revoke execute on function private.invoices_before_insert() from public, anon, authenticated;
create trigger invoices_before_insert before insert on public.invoices
  for each row execute function private.invoices_before_insert();

/* ---------- 지출 (재정 = 수납 + 지출) ---------- */
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  day date not null default current_date,
  category text not null check (char_length(category) between 1 and 20),
  amount integer not null check (amount between 0 and 1000000000), -- 원
  memo text check (char_length(memo) <= 200),
  created_at timestamptz not null default now()
);
create index expenses_academy_day_idx on public.expenses (academy_id, day);
comment on table public.expenses is '지출 (원장만)';

alter table public.expenses enable row level security;
create policy "원장만 지출을 볼 수 있음" on public.expenses for select to authenticated
  using (private.academy_role(academy_id) = 'owner');
create policy "원장만 지출을 추가" on public.expenses for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 지출을 고침" on public.expenses for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 지출을 삭제" on public.expenses for delete to authenticated
  using (private.academy_role(academy_id) = 'owner');

revoke all on public.expenses from anon, authenticated;
grant select, delete on public.expenses to authenticated;
grant insert (academy_id, day, category, amount, memo) on public.expenses to authenticated;
grant update (day, category, amount, memo) on public.expenses to authenticated;

/* ---------- 서류·행정 마감 ---------- */
create table public.paperwork (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  org text check (char_length(org) <= 50),      -- 내는 곳 (교육청 · 세무서 · 4대보험 공단 …)
  due date,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  memo text check (char_length(memo) <= 500),
  created_at timestamptz not null default now()
);
create index paperwork_academy_idx on public.paperwork (academy_id);
comment on table public.paperwork is '서류·행정 마감 (원장만)';

alter table public.paperwork enable row level security;
create policy "원장만 서류를 볼 수 있음" on public.paperwork for select to authenticated
  using (private.academy_role(academy_id) = 'owner');
create policy "원장만 서류를 추가" on public.paperwork for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 서류를 고침" on public.paperwork for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 서류를 삭제" on public.paperwork for delete to authenticated
  using (private.academy_role(academy_id) = 'owner');

revoke all on public.paperwork from anon, authenticated;
grant select, delete on public.paperwork to authenticated;
grant insert (academy_id, title, org, due, status, memo) on public.paperwork to authenticated;
grant update (title, org, due, status, memo) on public.paperwork to authenticated;

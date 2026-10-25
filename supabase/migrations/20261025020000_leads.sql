-- 3단계 테이블: 상담·등록 (문의 → 상담 → 체험수업 → 등록)
-- 원장·강사가 함께 관리하고, "등록"으로 옮기면 원생 명단(students)에 자동으로 추가돼요.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  student_name text not null check (char_length(student_name) between 1 and 50),
  grade text check (char_length(grade) <= 20),
  want text check (char_length(want) <= 50),          -- 희망 반
  source text check (char_length(source) <= 30),      -- 문의 경로
  parent_name text check (char_length(parent_name) <= 50),
  parent_phone text check (char_length(parent_phone) <= 30),
  next_action text check (char_length(next_action) <= 100), -- 다음 할 일
  memo text check (char_length(memo) <= 500),
  stage text not null default 'inquiry' check (stage in ('inquiry', 'consult', 'trial', 'enrolled')),
  urgent boolean not null default false,
  student_id uuid references public.students (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_academy_idx on public.leads (academy_id);
comment on table public.leads is '상담·등록 (문의 → 상담 → 체험수업 → 등록)';

alter table public.leads enable row level security;

create policy "원장·강사는 상담을 볼 수 있음" on public.leads for select to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장·강사는 상담을 추가" on public.leads for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장·강사는 상담을 고침" on public.leads for update to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher'))
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장만 상담을 삭제" on public.leads for delete to authenticated
  using (private.academy_role(academy_id) = 'owner');

revoke all on public.leads from anon, authenticated;
grant select, delete on public.leads to authenticated;
grant insert (academy_id, student_name, grade, want, source, parent_name, parent_phone, next_action, memo, stage, urgent) on public.leads to authenticated;
grant update (student_name, grade, want, source, parent_name, parent_phone, next_action, memo, stage, urgent) on public.leads to authenticated;

-- 등록으로 옮기면 원생 명단에 자동 추가 + 고친 시각 기록
create function private.leads_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.stage = 'enrolled' and new.student_id is null then
    insert into public.students (academy_id, name, grade, class_name, parent_name, parent_phone, memo)
      values (new.academy_id, new.student_name, new.grade, new.want, new.parent_name, new.parent_phone,
              left('상담에서 등록 · ' || coalesce(new.source, '경로 미입력'), 500))
      returning id into new.student_id;
    new.urgent := false;
  end if;
  return new;
end;
$$;
revoke execute on function private.leads_before_write() from public, anon, authenticated;

create trigger leads_before_write
  before insert or update on public.leads
  for each row execute function private.leads_before_write();

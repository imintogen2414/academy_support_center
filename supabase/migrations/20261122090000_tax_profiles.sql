-- 종합소득세 미리 보기에 넣는 원장님 본인 공제 정보 (부양가족 · 국민연금 · 노란우산 · 연금저축 · 중간예납 …)
-- 한 학원에 원장이 여러 명이어도 세금은 사람마다 달라서 (본인, 학원, 해)마다 한 줄. 본인 것만 보고 고쳐요.
create table if not exists public.tax_profiles (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  year int not null check (year between 2020 and 2100),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 8000),
  updated_at timestamptz not null default now(),
  primary key (user_id, academy_id, year)
);
comment on table public.tax_profiles is '종합소득세 미리 보기 공제 정보 (원장 본인만)';
alter table public.tax_profiles enable row level security;
create policy "본인 세금 공제 보기" on public.tax_profiles for select to authenticated
  using (user_id = (select auth.uid()) and private.academy_role(academy_id) = 'owner');
create policy "본인 세금 공제 넣기" on public.tax_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and private.academy_role(academy_id) = 'owner');
create policy "본인 세금 공제 고치기" on public.tax_profiles for update to authenticated
  using (user_id = (select auth.uid()) and private.academy_role(academy_id) = 'owner')
  with check (user_id = (select auth.uid()) and private.academy_role(academy_id) = 'owner');
create policy "본인 세금 공제 지우기" on public.tax_profiles for delete to authenticated
  using (user_id = (select auth.uid()) and private.academy_role(academy_id) = 'owner');
revoke all on public.tax_profiles from anon;
grant select, insert, update, delete on public.tax_profiles to authenticated;

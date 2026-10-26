-- 9단계: 재정 — 수납 말고 직접 넣는 수입(교재 판매 · 특강 · 기타)
-- 매출 = 수납·청구에서 납부 확인한 금액 + 이 표의 수입. 순이익 = 매출 - 지출. 원장만.
create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  day date not null default current_date,
  category text not null check (char_length(category) between 1 and 20),
  amount integer not null check (amount between 0 and 1000000000), -- 원
  memo text check (char_length(memo) <= 200),
  created_at timestamptz not null default now()
);
create index incomes_academy_day_idx on public.incomes (academy_id, day);
comment on table public.incomes is '수납 밖의 수입 (원장만)';

alter table public.incomes enable row level security;
create policy "원장만 수입을 볼 수 있음" on public.incomes for select to authenticated
  using (private.academy_role(academy_id) = 'owner');
create policy "원장만 수입을 추가" on public.incomes for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 수입을 고침" on public.incomes for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 수입을 삭제" on public.incomes for delete to authenticated
  using (private.academy_role(academy_id) = 'owner');

revoke all on public.incomes from anon, authenticated;
grant select, delete on public.incomes to authenticated;
grant insert (academy_id, day, category, amount, memo) on public.incomes to authenticated;
grant update (day, category, amount, memo) on public.incomes to authenticated;

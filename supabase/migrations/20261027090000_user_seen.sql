-- 18단계: 새 소식 빨간 점 — 메뉴마다 마지막으로 본 시각을 기억해요. 그 뒤에 생긴 게 있으면 빨간 점, 열어 보면 사라져요.
create table public.user_seen (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  key text not null check (char_length(key) between 1 and 60),
  seen_at timestamptz not null default now(),
  primary key (user_id, key)
);
comment on table public.user_seen is '메뉴별 마지막으로 본 시각 (본인 것만)';
alter table public.user_seen enable row level security;
create policy "내 기록만 보기" on public.user_seen for select to authenticated using (user_id = (select auth.uid()));
create policy "내 기록만 넣기" on public.user_seen for insert to authenticated with check (user_id = (select auth.uid()));
create policy "내 기록만 고치기" on public.user_seen for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.user_seen from anon, authenticated;
grant select on public.user_seen to authenticated;
grant insert (key, seen_at) on public.user_seen to authenticated;
grant update (key, seen_at) on public.user_seen to authenticated; -- upsert(on conflict)가 key도 다시 써요

-- 제휴 신청 · 유학 상담 신청도 단계가 바뀐 시각을 남겨요 (원장 · 학부모에게 빨간 점)
alter table public.partner_applications add column updated_at timestamptz not null default now();
alter table public.abroad_requests add column updated_at timestamptz not null default now();
create trigger partner_applications_touch before update on public.partner_applications for each row execute function private.touch_updated_at();
create trigger abroad_requests_touch before update on public.abroad_requests for each row execute function private.touch_updated_at();

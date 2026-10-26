-- 16단계: 서류·행정 자동 처리
-- repeat: 매달 · 매년 돌아오는 서류는 "제출 완료"를 누르면 다음 회차가 저절로 생겨요(화면이 넣어요).
-- auto_key: 데이터에서 저절로 찾아 준 서류(예: 2026-10 원천세)를 같은 걸 두 번 넣지 않게 표시해요.
alter table public.paperwork
  add column repeat text not null default 'none' check (repeat in ('none', 'monthly', 'yearly')),
  add column auto_key text check (char_length(auto_key) <= 100);
create unique index paperwork_auto_key_uniq on public.paperwork (academy_id, auto_key) where auto_key is not null;
grant insert (repeat, auto_key) on public.paperwork to authenticated;
grant update (repeat) on public.paperwork to authenticated;

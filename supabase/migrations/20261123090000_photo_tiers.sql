-- 사진 읽기: 무료(이 기기 안) → AI. AI는 빠른 모델(fast, Haiku)로 먼저 읽고 흐리면 정확한 모델(precise, Sonnet)로 다시 읽어요.
-- 장수는 그대로 "AI로 읽은 횟수"(한 번 = 한 장)이고, 비용을 보려고 어느 모델까지 썼는지만 남겨요(Edge Function read-photo가 note_photo_read로).
alter table public.photo_reads add column if not exists tier text check (tier in ('fast', 'precise'));
create or replace function public.note_photo_read(p_id uuid, p_tier text) returns void
language sql security definer set search_path = '' as $$
  update public.photo_reads set tier = p_tier
   where id = p_id and user_id = auth.uid() and p_tier in ('fast', 'precise') and created_at > now() - interval '10 minutes';
$$;
revoke all on function public.note_photo_read(uuid, text) from public, anon;
grant execute on function public.note_photo_read(uuid, text) to authenticated;

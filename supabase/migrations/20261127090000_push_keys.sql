-- 알림 · 결제 키를 대시보드에 따로 넣지 않도록 vault에서 읽어요 (서비스 키만 부를 수 있어요)
-- vault에 넣는 값(push_url · push_hook · push_vapid_pub · push_vapid_priv · toss_test_secret)은 SQL 편집기에서 vault.create_secret로 따로 넣어요 — 이 파일에는 값을 쓰지 않아요.
create or replace function public.push_keys() returns jsonb language sql stable security definer set search_path = ''
as $$ select jsonb_build_object(
  'pub', (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_pub'),
  'priv', (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_priv'),
  'hook', (select decrypted_secret from vault.decrypted_secrets where name = 'push_hook')); $$;
create or replace function public.pay_keys() returns jsonb language sql stable security definer set search_path = ''
as $$ select jsonb_build_object('test', (select decrypted_secret from vault.decrypted_secrets where name = 'toss_test_secret')); $$;
revoke all on function public.push_keys(), public.pay_keys() from public, anon, authenticated;
grant execute on function public.push_keys(), public.pay_keys() to service_role;

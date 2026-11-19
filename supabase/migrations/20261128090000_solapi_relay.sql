-- 솔라피 문자는 "허용 IP를 꼭 직접 등록"해야 해요. Edge Function은 나가는 IP가 계속 바뀌어서(AWS 서울 여러 개),
-- 문자는 IP가 고정인 데이터베이스 서버가 pg_net으로 대신 보내요. 서명(Authorization: HMAC)은 함수가 만들어 넘기고(키 · 시크릿은 DB로 안 와요),
-- DB는 정해진 솔라피 주소로만 보내요. 서비스 키(함수)만 부를 수 있어요. 솔라피 허용 IP = 이 DB가 나가는 IP(SELECT net.http_get('https://api.ipify.org')로 확인).
create or replace function public.solapi_relay(p_path text, p_auth text, p_body jsonb)
returns bigint language plpgsql security definer set search_path = ''
as $$
begin
  if p_path not in ('/messages/v4/send', '/messages/v4/send-many/detail') then raise exception 'bad_path'; end if;
  if p_auth !~ '^HMAC-SHA256 apiKey=[A-Za-z0-9]+, date=[0-9TZ:.+-]+, salt=[A-Za-z0-9]+, signature=[a-f0-9]{64}$' then raise exception 'bad_auth'; end if;
  return net.http_post(url := 'https://api.solapi.com' || p_path, body := p_body,
    headers := jsonb_build_object('Authorization', p_auth, 'Content-Type', 'application/json'), timeout_milliseconds := 15000);
end $$;
-- 보낸 결과 (아직이면 null)
create or replace function public.solapi_result(p_id bigint)
returns jsonb language sql stable security definer set search_path = ''
as $$ select jsonb_build_object('status', status_code, 'body', content, 'error', error_msg, 'timed_out', timed_out) from net._http_response where id = p_id; $$;
revoke all on function public.solapi_relay(text, text, jsonb), public.solapi_result(bigint) from public, anon, authenticated;
grant execute on function public.solapi_relay(text, text, jsonb), public.solapi_result(bigint) to service_role;

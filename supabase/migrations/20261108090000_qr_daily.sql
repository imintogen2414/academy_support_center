-- 출석 QR을 하루 단위로: 20초마다 바뀌던 QR을 한국 날짜마다 하나로 바꿔요.
-- 입구 화면을 계속 켜 두지 않아도 되고(아침에 한 번 띄우거나 인쇄해서 붙여 두기), 그날 QR은 그날만 받아요.

-- 칸 번호 = 한국 날짜(2000-01-01부터 며칠째)
create or replace function private.checkin_win() returns bigint
language sql stable set search_path = '' as $$ select ((now() at time zone 'Asia/Seoul')::date - date '2000-01-01')::bigint $$;

create or replace function public.qr_check_in(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare parts text[] := string_to_array(coalesce(p_token, ''), '.'); v_acad uuid; v_win bigint; v_out jsonb := '[]'::jsonb; r jsonb; k record;
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  if cardinality(parts) <> 3 then raise exception 'bad_qr'; end if;
  begin v_acad := parts[1]::uuid; v_win := parts[2]::bigint; exception when others then raise exception 'bad_qr'; end;
  -- 오늘 QR만 (어제 것 · 예전 20초 QR은 qr_expired)
  if v_win <> private.checkin_win() then raise exception 'qr_expired'; end if;
  if parts[3] <> private.checkin_sig(v_acad, v_win) then raise exception 'bad_qr'; end if;
  if coalesce(private.academy_role(v_acad), '') not in ('student', 'parent') then raise exception 'not_family'; end if;
  for k in select l.student_id from public.student_links l where l.user_id = (select auth.uid()) and l.academy_id = v_acad loop
    r := private.do_checkin(k.student_id, 'qr', (select auth.uid()));
    if r is not null then v_out := v_out || jsonb_build_array(r); end if;
  end loop;
  if jsonb_array_length(v_out) = 0 then raise exception 'not_linked'; end if;
  return v_out;
end $$;

revoke all on function public.qr_check_in(text) from public, anon;
grant execute on function public.qr_check_in(text) to authenticated;

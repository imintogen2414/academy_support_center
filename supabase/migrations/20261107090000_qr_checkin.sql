-- 학원에 와야만 하는 출석: 입구 화면(태블릿 · 모니터)에 20초마다 바뀌는 QR → 학생 · 학부모 휴대폰 카메라로 찍으면 출석
-- 휴대폰이 없는 학생은 같은 화면에서 출석 번호(학부모 · 본인 휴대폰 뒤 4자리)를 눌러요.
-- 수업 시작 10분이 지나 찍으면 지각. 출석 방법 · 시각은 attendance.method · checked_at에 남아요.

alter table public.attendance add column if not exists method text check (method in ('qr', 'kiosk', 'staff'));
alter table public.attendance add column if not exists checked_at timestamptz;

-- 학원마다 QR 서명 키 (API에 안 보이는 private)
create table if not exists private.checkin_keys (
  academy_id uuid primary key references public.academies(id) on delete cascade,
  secret text not null default encode(extensions.gen_random_bytes(24), 'hex')
);

create or replace function private.checkin_sig(p_academy uuid, p_win bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare v_secret text;
begin
  insert into private.checkin_keys (academy_id) values (p_academy) on conflict do nothing;
  select secret into v_secret from private.checkin_keys where academy_id = p_academy;
  return substr(encode(extensions.hmac(p_academy::text || ':' || p_win::text, v_secret, 'sha256'), 'hex'), 1, 16);
end $$;

-- 20초 칸 번호
create or replace function private.checkin_win() returns bigint
language sql stable set search_path = '' as $$ select floor(extract(epoch from now()) / 20)::bigint $$;

-- 한 학생 출석 처리 (이미 있으면 그대로) → 상태 돌려줌
create or replace function private.do_checkin(p_student uuid, p_method text, p_by uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s record; v_day date := (now() at time zone 'Asia/Seoul')::date; v_now time := (now() at time zone 'Asia/Seoul')::time;
  v_start time; v_status text; v_old record;
begin
  select id, academy_id, name, class_name into s from public.students where id = p_student and coalesce(status, 'active') = 'active';
  if s.id is null then return null; end if;
  select status, checked_at into v_old from public.attendance where student_id = s.id and day = v_day;
  if v_old.status is not null then
    return jsonb_build_object('student_id', s.id, 'name', s.name, 'status', v_old.status, 'already', true, 'at', v_old.checked_at);
  end if;
  -- 오늘 그 반 수업 중 지금과 가장 가까운 시작 시각 (끝나기 전 수업)
  select t.start_time into v_start from public.timetable t
    where t.academy_id = s.academy_id and t.class_name = s.class_name and t.weekday = extract(dow from v_day)::int and t.end_time > v_now
    order by t.start_time limit 1;
  v_status := case when v_start is not null and v_now > v_start + interval '10 minutes' then 'late' else 'present' end;
  insert into public.attendance (academy_id, student_id, day, status, checked_by, method, checked_at)
    values (s.academy_id, s.id, v_day, v_status, p_by, p_method, now())
    on conflict (student_id, day) do nothing;
  return jsonb_build_object('student_id', s.id, 'name', s.name, 'status', v_status, 'already', false, 'at', now());
end $$;

-- 입구 화면: 지금 QR 글자 (원장 · 강사)
create or replace function public.checkin_qr(p_academy uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare w bigint := private.checkin_win();
begin
  if coalesce(private.academy_role(p_academy), '') not in ('owner', 'teacher') then raise exception 'not_allowed'; end if;
  return p_academy::text || '.' || w::text || '.' || private.checkin_sig(p_academy, w);
end $$;

-- 학생 · 학부모: 찍은 QR로 출석 (QR은 만든 뒤 약 1분까지 받아요)
create or replace function public.qr_check_in(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare parts text[] := string_to_array(coalesce(p_token, ''), '.'); v_acad uuid; v_win bigint; v_out jsonb := '[]'::jsonb; r jsonb; k record;
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  if cardinality(parts) <> 3 then raise exception 'bad_qr'; end if;
  begin v_acad := parts[1]::uuid; v_win := parts[2]::bigint; exception when others then raise exception 'bad_qr'; end;
  if v_win < private.checkin_win() - 3 or v_win > private.checkin_win() then raise exception 'qr_expired'; end if;
  if parts[3] <> private.checkin_sig(v_acad, v_win) then raise exception 'bad_qr'; end if;
  if coalesce(private.academy_role(v_acad), '') not in ('student', 'parent') then raise exception 'not_family'; end if;
  for k in select l.student_id from public.student_links l where l.user_id = (select auth.uid()) and l.academy_id = v_acad loop
    r := private.do_checkin(k.student_id, 'qr', (select auth.uid()));
    if r is not null then v_out := v_out || jsonb_build_array(r); end if;
  end loop;
  if jsonb_array_length(v_out) = 0 then raise exception 'not_linked'; end if;
  return v_out;
end $$;

-- 입구 화면에서 출석 번호(휴대폰 뒤 4자리)로 찾기 · 출석 (원장 · 강사가 켜 둔 화면)
create or replace function public.kiosk_find(p_academy uuid, p_code text) returns table(student_id uuid, name text, class_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(private.academy_role(p_academy), '') not in ('owner', 'teacher') then raise exception 'not_allowed'; end if;
  if p_code !~ '^\d{4}$' then return; end if;
  return query select s.id, s.name, s.class_name from public.students s
    where s.academy_id = p_academy and coalesce(s.status, 'active') = 'active'
      and (right(regexp_replace(coalesce(s.parent_phone, ''), '\D', '', 'g'), 4) = p_code or right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 4) = p_code)
    order by s.name limit 6;
end $$;

create or replace function public.kiosk_check_in(p_academy uuid, p_student uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(private.academy_role(p_academy), '') not in ('owner', 'teacher') then raise exception 'not_allowed'; end if;
  if not exists (select 1 from public.students where id = p_student and academy_id = p_academy) then raise exception 'not_allowed'; end if;
  return private.do_checkin(p_student, 'kiosk', (select auth.uid()));
end $$;

-- 입구 화면 아래 "방금 출석": 오늘 QR · 번호로 들어온 출석
create or replace function public.kiosk_recent(p_academy uuid) returns table(name text, class_name text, status text, method text, checked_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(private.academy_role(p_academy), '') not in ('owner', 'teacher') then raise exception 'not_allowed'; end if;
  return query select s.name, s.class_name, a.status, a.method, a.checked_at from public.attendance a join public.students s on s.id = a.student_id
    where a.academy_id = p_academy and a.day = (now() at time zone 'Asia/Seoul')::date and a.method in ('qr', 'kiosk')
    order by a.checked_at desc limit 12;
end $$;

-- 선생님이 직접 넣은 출결은 method = staff
create or replace function public.mark_attendance(p_students uuid[], p_day date, p_status text)
 returns void language plpgsql security definer set search_path to '' as $function$
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  if p_status is not null and p_status not in ('present', 'late', 'absent', 'early') then raise exception 'bad_status'; end if;
  if p_day is null or cardinality(p_students) is null or cardinality(p_students) > 500 then raise exception 'bad_input'; end if;
  if exists (select 1 from unnest(p_students) as u(sid) where not private.can_see_student(u.sid)) then raise exception 'not_allowed'; end if;
  if p_status is null then
    delete from public.attendance where student_id = any (p_students) and day = p_day;
  else
    insert into public.attendance (academy_id, student_id, day, status, checked_by, method, checked_at)
      select s.academy_id, s.id, p_day, p_status, (select auth.uid()), 'staff', now()
      from public.students s where s.id = any (p_students)
    on conflict (student_id, day) do update
      set status = excluded.status, checked_by = excluded.checked_by, method = 'staff', checked_at = now(), updated_at = now();
  end if;
end;
$function$;

revoke all on function public.checkin_qr(uuid), public.qr_check_in(text), public.kiosk_find(uuid, text), public.kiosk_check_in(uuid, uuid), public.kiosk_recent(uuid) from public, anon;
grant execute on function public.checkin_qr(uuid), public.qr_check_in(text), public.kiosk_find(uuid, text), public.kiosk_check_in(uuid, uuid), public.kiosk_recent(uuid) to authenticated;
revoke all on function private.do_checkin(uuid, text, uuid), private.checkin_sig(uuid, bigint) from public, anon, authenticated;

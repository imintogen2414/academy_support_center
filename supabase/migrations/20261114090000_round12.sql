-- 12라운드
-- 1) 바뀐 기록이 실제 시간표와 맞게: 고칠 때 바뀌기 전 → 바뀐 뒤를 함께 남기고,
--    "이 주만 빼기"(skip_weeks만 바뀜)는 "고침"이 아니라 "○/○ 주 뺌"으로, 이 주에만 있는 칸은 "○/○ 주만"을 붙여요.
alter table public.schedule_logs drop constraint if exists schedule_logs_action_check;
alter table public.schedule_logs add constraint schedule_logs_action_check check (action in ('add', 'edit', 'delete', 'skip'));

create or replace function private.schedule_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; v_sum text; v_old text; v_role text; v_action text;
  days text[] := array['일', '월', '화', '수', '목', '금', '토'];
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if (select auth.uid()) is null or not exists (select 1 from public.academies where id = r.academy_id) then return null; end if;
  v_action := case tg_op when 'INSERT' then 'add' when 'UPDATE' then 'edit' else 'delete' end;
  if tg_table_name = 'timetable' then
    v_sum := format('%s · %s요일 %s~%s%s%s', r.class_name, days[r.weekday + 1], to_char(r.start_time, 'HH24:MI'), to_char(r.end_time, 'HH24:MI'),
      case when coalesce(r.subject, '') <> '' then ' · ' || r.subject else '' end,
      case when r.week_of is not null then format(' · %s 주만', to_char(r.week_of, 'FMMM/FMDD')) else '' end);
    if tg_op = 'UPDATE' then
      v_old := format('%s · %s요일 %s~%s%s%s', old.class_name, days[old.weekday + 1], to_char(old.start_time, 'HH24:MI'), to_char(old.end_time, 'HH24:MI'),
        case when coalesce(old.subject, '') <> '' then ' · ' || old.subject else '' end,
        case when old.week_of is not null then format(' · %s 주만', to_char(old.week_of, 'FMMM/FMDD')) else '' end);
      -- 이 주만 빼기: 다른 칸은 그대로고 빠지는 주만 늘었어요
      if v_old = v_sum and coalesce(new.skip_weeks, '{}') is distinct from coalesce(old.skip_weeks, '{}') then
        v_sum := v_sum || format(' · %s 주 뺌', (select string_agg(to_char(w, 'FMMM/FMDD'), ', ')
          from unnest(new.skip_weeks) w where not (w = any (coalesce(old.skip_weeks, '{}')))));
        v_action := 'skip';
      elsif v_old <> v_sum then
        v_sum := v_old || ' → ' || v_sum;
      else
        -- 시간 · 요일은 그대로고 다른 칸만 바뀌었으면 무엇이 바뀌었는지
        v_sum := v_sum || coalesce(' · ' || nullif(concat_ws(' · ',
          case when new.room is distinct from old.room then '강의실 ' || coalesce(new.room, '비움') end,
          case when new.teacher_name is distinct from old.teacher_name then '담당 ' || coalesce(new.teacher_name, '비움') end,
          case when new.note is distinct from old.note then '메모 바뀜' end,
          case when new.color is distinct from old.color then '색 바뀜' end), ''), '');
      end if;
    end if;
  else
    v_sum := format('%s · %s', to_char(r.day, 'MM/DD'), r.title);
    if tg_op = 'UPDATE' then
      v_old := format('%s · %s', to_char(old.day, 'MM/DD'), old.title);
      if v_old <> v_sum then v_sum := v_old || ' → ' || v_sum; end if;
    end if;
  end if;
  v_role := private.academy_role(r.academy_id);
  insert into public.schedule_logs (academy_id, kind, action, summary, who, who_name, who_role)
  values (r.academy_id, case when tg_table_name = 'timetable' then 'timetable' else 'event' end,
    v_action, left(v_sum, 300), (select auth.uid()), private.who_label(), v_role);
  return null;
end $$;

-- 2) 학부모는 QR을 찍지 않아요: QR 출석은 학생 계정만 (학부모는 출석 알림만 받아요)
create or replace function public.qr_check_in(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare parts text[] := string_to_array(coalesce(p_token, ''), '.'); v_acad uuid; v_win bigint; v_out jsonb := '[]'::jsonb; r jsonb; k record;
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  if cardinality(parts) <> 3 then raise exception 'bad_qr'; end if;
  begin v_acad := parts[1]::uuid; v_win := parts[2]::bigint; exception when others then raise exception 'bad_qr'; end;
  if v_win <> private.checkin_win() then raise exception 'qr_expired'; end if;
  if parts[3] <> private.checkin_sig(v_acad, v_win) then raise exception 'bad_qr'; end if;
  if private.academy_role(v_acad) = 'parent' then raise exception 'parent_no_qr'; end if;
  if coalesce(private.academy_role(v_acad), '') <> 'student' then raise exception 'not_family'; end if;
  for k in select l.student_id from public.student_links l where l.user_id = (select auth.uid()) and l.academy_id = v_acad loop
    r := private.do_checkin(k.student_id, 'qr', (select auth.uid()));
    if r is not null then v_out := v_out || jsonb_build_array(r); end if;
  end loop;
  if jsonb_array_length(v_out) = 0 then raise exception 'not_linked'; end if;
  return v_out;
end $$;

-- 3) 우리 학원 사람 수 · 누가 있는지는 원장 · 강사만 (학부모 · 학생은 볼 수 없어요)
create or replace function public.academy_people_counts(p_academy uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when coalesce(private.academy_role(p_academy), '') not in ('owner', 'teacher') then null else jsonb_build_object(
    'owner', (select count(*) from public.academy_members where academy_id = p_academy and role = 'owner'),
    'teacher', (select count(*) from public.academy_members where academy_id = p_academy and role = 'teacher'),
    'parent', (select count(*) from public.academy_members where academy_id = p_academy and role = 'parent'),
    'student', (select count(*) from public.academy_members where academy_id = p_academy and role = 'student'),
    'enrolled', (select count(*) from public.students where academy_id = p_academy and coalesce(status, 'active') = 'active')
  ) end;
$$;

create or replace function public.academy_people_list(p_academy uuid)
returns table(user_id uuid, name text, role text, title text, kids text, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(p.name, p.username, '이름 없음'), m.role, m.title,
    (select string_agg(s.name, ', ' order by s.name) from public.student_links l join public.students s on s.id = l.student_id where l.user_id = m.user_id and l.academy_id = p_academy),
    m.created_at
  from public.academy_members m left join public.profiles p on p.id = m.user_id
  where m.academy_id = p_academy and private.academy_role(p_academy) in ('owner', 'teacher')
  order by array_position(array['owner', 'teacher', 'parent', 'student'], m.role), m.created_at;
$$;

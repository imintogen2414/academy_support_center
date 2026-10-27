-- 14라운드
-- 1) 시간표 기간: 매주 수업도 "언제부터 언제까지"(from_week ~ to_week, 그 주 월요일)를 정해요.
--    비어 있으면 끝 없이 계속. 한 달 · 3개월처럼 넣고 "다음 달도 이어가기"로 늘려요.
alter table public.timetable add column if not exists from_week date, add column if not exists to_week date;
grant insert (from_week, to_week) on public.timetable to authenticated;
grant update (from_week, to_week) on public.timetable to authenticated;

create or replace function private.tt_on(t public.timetable, d date)
returns boolean language sql stable set search_path = '' as $$
  select t.weekday = extract(dow from d)::int
    and not (coalesce(t.cancels, '{}'::jsonb) ? to_char(date_trunc('week', d)::date, 'YYYY-MM-DD'))
    and case when t.week_of is not null then t.week_of = date_trunc('week', d)::date
             else not (date_trunc('week', d)::date = any(t.skip_weeks))
               and (t.from_week is null or date_trunc('week', d)::date >= t.from_week)
               and (t.to_week is null or date_trunc('week', d)::date <= t.to_week) end;
$$;

drop function if exists public.family_timetable(uuid);
create function public.family_timetable(p_academy uuid)
returns table(id uuid, class_name text, weekday smallint, start_time time, end_time time, subject text, color text, week_of date, skip_weeks date[], kind text, cancels jsonb, from_week date, to_week date)
language sql stable security definer set search_path = '' as $$
  select t.id, t.class_name, t.weekday, t.start_time, t.end_time, t.subject, t.color, t.week_of, t.skip_weeks, t.kind, t.cancels, t.from_week, t.to_week
  from public.timetable t
  where t.academy_id = p_academy and private.academy_role(p_academy) in ('parent', 'student')
  order by t.weekday, t.start_time;
$$;
revoke all on function public.family_timetable(uuid) from public, anon;
grant execute on function public.family_timetable(uuid) to authenticated;

-- 바뀐 기록에도 기간이 보여요 (~11/30 · 기간 바뀜)
create or replace function private.tt_line(r public.timetable)
returns text language sql immutable set search_path = '' as $$
  select format('%s · %s요일 %s~%s%s%s', r.class_name, (array['일', '월', '화', '수', '목', '금', '토'])[r.weekday + 1], to_char(r.start_time, 'HH24:MI'), to_char(r.end_time, 'HH24:MI'),
    case when coalesce(r.subject, '') <> '' then ' · ' || r.subject else '' end,
    case when r.kind = 'makeup' then format(' · %s 보강', to_char(r.week_of + ((r.weekday + 6) % 7), 'FMMM/FMDD'))
         when r.week_of is not null then format(' · %s 주만', to_char(r.week_of, 'FMMM/FMDD'))
         when r.to_week is not null then format(' · ~%s', to_char(r.to_week + ((r.weekday + 6) % 7), 'FMMM/FMDD'))
         else '' end);
$$;

create or replace function private.schedule_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; v_sum text; v_old text; v_role text; v_action text;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if (select auth.uid()) is null or not exists (select 1 from public.academies where id = r.academy_id) then return null; end if;
  v_action := case tg_op when 'INSERT' then 'add' when 'UPDATE' then 'edit' else 'delete' end;
  if tg_table_name = 'timetable' then
    v_sum := private.tt_line(r::public.timetable);
    if tg_op = 'UPDATE' then
      v_old := private.tt_line(old::public.timetable);
      if v_old = v_sum and coalesce(new.cancels, '{}') is distinct from coalesce(old.cancels, '{}') then
        v_sum := v_sum || coalesce((select ' · ' || string_agg(to_char(k::date, 'FMMM/FMDD') || ' 주 휴강' || case when coalesce(new.cancels ->> k, '') <> '' then '(' || (new.cancels ->> k) || ')' else '' end, ', ')
          from jsonb_object_keys(coalesce(new.cancels, '{}')) k where not (coalesce(old.cancels, '{}') ? k)), '')
          || coalesce((select ' · ' || string_agg(to_char(k::date, 'FMMM/FMDD') || ' 주 휴강 풀림', ', ')
          from jsonb_object_keys(coalesce(old.cancels, '{}')) k where not (coalesce(new.cancels, '{}') ? k)), '');
        v_action := 'skip';
      elsif v_old = v_sum and coalesce(new.skip_weeks, '{}') is distinct from coalesce(old.skip_weeks, '{}') then
        v_sum := v_sum || coalesce(format(' · %s 주 뺌', (select string_agg(to_char(w, 'FMMM/FMDD'), ', ')
          from unnest(new.skip_weeks) w where not (w = any (coalesce(old.skip_weeks, '{}'))))), ' · 빠진 주 되돌림');
        v_action := 'skip';
      elsif v_old <> v_sum then
        v_sum := v_old || ' → ' || v_sum;
      else
        v_sum := v_sum || coalesce(' · ' || nullif(concat_ws(' · ',
          case when new.room is distinct from old.room then '강의실 ' || coalesce(new.room, '비움') end,
          case when new.teacher_name is distinct from old.teacher_name then '담당 ' || coalesce(new.teacher_name, '비움') end,
          case when new.note is distinct from old.note then '메모 바뀜' end,
          case when new.color is distinct from old.color then '색 바뀜' end,
          case when new.from_week is distinct from old.from_week then '시작 주 바뀜' end), ''), '');
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

-- 2) 파일 크기: 자료실 · 공지 · 채팅 파일 하나에 2GB까지 (프로젝트 전체 업로드 한도도 2GB 이상이어야 실제로 돼요)
update storage.buckets set file_size_limit = 2147483648 where id in ('library', 'chat');
-- 공지는 사진뿐 아니라 파일도 붙여요
update storage.buckets set file_size_limit = 2147483648, allowed_mime_types = null where id = 'notices';
alter table public.notices add column if not exists files jsonb not null default '[]'::jsonb;
grant insert (files) on public.notices to authenticated;
grant update (files) on public.notices to authenticated;

-- 3) 센터 공지: 센터 관리자 → 학원 원장님(원하면 강사님도). 모든 학원 또는 고른 학원만.
create table if not exists public.center_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  body text check (char_length(body) <= 5000),
  all_academies boolean not null default true,
  academy_ids uuid[] not null default '{}',
  with_teachers boolean not null default false,
  pinned boolean not null default false,
  files jsonb not null default '[]'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
alter table public.center_notices enable row level security;

create or replace function private.can_see_center_notice(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_center_admin() or exists (
    select 1 from public.center_notices n join public.academy_members m on m.user_id = (select auth.uid())
    where n.id = p_id and (m.role = 'owner' or (n.with_teachers and m.role = 'teacher'))
      and (n.all_academies or m.academy_id = any (n.academy_ids)));
$$;

drop policy if exists "센터 공지 보기" on public.center_notices;
create policy "센터 공지 보기" on public.center_notices for select to authenticated using (private.can_see_center_notice(id));
drop policy if exists "센터 공지 쓰기" on public.center_notices;
create policy "센터 공지 쓰기" on public.center_notices for insert to authenticated with check (private.is_center_admin());
drop policy if exists "센터 공지 고치기" on public.center_notices;
create policy "센터 공지 고치기" on public.center_notices for update to authenticated using (private.is_center_admin()) with check (private.is_center_admin());
drop policy if exists "센터 공지 지우기" on public.center_notices;
create policy "센터 공지 지우기" on public.center_notices for delete to authenticated using (private.is_center_admin());
grant select, delete on public.center_notices to authenticated;
grant insert (title, body, all_academies, academy_ids, with_teachers, pinned, files) on public.center_notices to authenticated;
grant update (title, body, all_academies, academy_ids, with_teachers, pinned, files) on public.center_notices to authenticated;

create or replace function private.center_notice_touch()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists center_notice_touch on public.center_notices;
create trigger center_notice_touch before update on public.center_notices for each row execute function private.center_notice_touch();

create table if not exists public.center_notice_reads (
  notice_id uuid not null references public.center_notices(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  read_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);
alter table public.center_notice_reads enable row level security;
drop policy if exists "내 읽음만" on public.center_notice_reads;
create policy "내 읽음만" on public.center_notice_reads for select to authenticated using (user_id = (select auth.uid()));
grant select on public.center_notice_reads to authenticated;

create or replace function public.mark_center_notice_read(p_notice uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.can_see_center_notice(p_notice) or private.is_center_admin() and not exists (
    select 1 from public.academy_members where user_id = (select auth.uid())) then return; end if;
  insert into public.center_notice_reads (notice_id, user_id) values (p_notice, (select auth.uid())) on conflict do nothing;
end $$;

-- 받는 사람과 읽은 시각 (센터 관리자만)
create or replace function public.center_notice_readers(p_notice uuid)
returns table(user_id uuid, name text, role text, academy_id uuid, academy_name text, read_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select distinct on (m.user_id) m.user_id, coalesce(p.name, p.username, '이름 없음'), m.role, a.id, a.name, r.read_at
  from public.center_notices n
  join public.academy_members m on (m.role = 'owner' or (n.with_teachers and m.role = 'teacher')) and (n.all_academies or m.academy_id = any (n.academy_ids))
  join public.academies a on a.id = m.academy_id
  left join public.profiles p on p.id = m.user_id
  left join public.center_notice_reads r on r.notice_id = n.id and r.user_id = m.user_id
  where n.id = p_notice and private.is_center_admin()
  order by m.user_id, (m.role = 'owner') desc;
$$;

create or replace function public.center_notice_stats()
returns table(notice_id uuid, total int, read int)
language sql stable security definer set search_path = '' as $$
  select n.id, count(distinct m.user_id)::int, count(distinct r.user_id)::int
  from public.center_notices n
  left join public.academy_members m on (m.role = 'owner' or (n.with_teachers and m.role = 'teacher')) and (n.all_academies or m.academy_id = any (n.academy_ids))
  left join public.center_notice_reads r on r.notice_id = n.id and r.user_id = m.user_id
  where private.is_center_admin()
  group by n.id;
$$;

revoke all on function public.mark_center_notice_read(uuid), public.center_notice_readers(uuid), public.center_notice_stats() from public, anon;
grant execute on function public.mark_center_notice_read(uuid), public.center_notice_readers(uuid), public.center_notice_stats() to authenticated;

-- 센터 공지 파일: 비공개 버킷 center/공지 id/…, 관리자만 올리고 받는 원장 · 강사가 읽어요
insert into storage.buckets (id, name, public, file_size_limit) values ('center', 'center', false, 2147483648)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;
drop policy if exists "센터 공지 파일 올리기" on storage.objects;
create policy "센터 공지 파일 올리기" on storage.objects for insert to authenticated with check (bucket_id = 'center' and private.is_center_admin());
drop policy if exists "센터 공지 파일 지우기" on storage.objects;
create policy "센터 공지 파일 지우기" on storage.objects for delete to authenticated using (bucket_id = 'center' and private.is_center_admin());
drop policy if exists "센터 공지 파일 읽기" on storage.objects;
create policy "센터 공지 파일 읽기" on storage.objects for select to authenticated using (bucket_id = 'center' and private.can_see_center_notice(private.path_uuid(name)));
-- 공지를 넣기 전에 파일을 먼저 올려요 (경로 center/공지 id/…) — 그래서 id를 화면이 정해 넣어요
grant insert (id) on public.center_notices to authenticated;

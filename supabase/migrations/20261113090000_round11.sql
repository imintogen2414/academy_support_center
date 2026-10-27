-- 11라운드
-- 0) 시간표 · 일정 색/주 칸에 쓰기 권한이 빠져 있어 고칠 때마다 "저장하지 못했어요"가 떴어요 (칸별 권한)
grant insert (color, week_of, skip_weeks) on public.timetable to authenticated;
grant update (color, week_of, skip_weeks) on public.timetable to authenticated;
grant insert (color) on public.academy_events to authenticated;
grant update (color) on public.academy_events to authenticated;

-- 1) 학원 나가기 · 내보내기 · 옮기기
-- 나가기: 원장이 아니면 누구나. 원장은 다른 원장이 있을 때만. 학부모 · 학생은 아이 연결도 함께 풀어요.
create or replace function public.leave_academy(p_academy uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid()); r text := private.academy_role(p_academy);
begin
  if r is null then raise exception 'not_member'; end if;
  if r = 'owner' and (select count(*) from public.academy_members where academy_id = p_academy and role = 'owner') < 2 then raise exception 'last_owner'; end if;
  delete from public.student_links where academy_id = p_academy and user_id = uid;
  delete from public.academy_members where academy_id = p_academy and user_id = uid;
end $$;
-- 내보내기: 원장(강사는 "강사 관리" 권한이 있으면 강사만). 원장과 나 자신은 못 내보내요.
create or replace function public.remove_member(p_academy uuid, p_user uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare tr text;
begin
  select role into tr from public.academy_members where academy_id = p_academy and user_id = p_user;
  if tr is null then raise exception 'not_member'; end if;
  if p_user = (select auth.uid()) or tr = 'owner' then raise exception 'not_allowed'; end if;
  if not (private.academy_role(p_academy) = 'owner' or (tr = 'teacher' and private.can_do(p_academy, 'staff'))) then raise exception 'not_allowed'; end if;
  delete from public.student_links where academy_id = p_academy and user_id = p_user;
  delete from public.academy_members where academy_id = p_academy and user_id = p_user;
end $$;
-- 옮기기: 새 학원 코드로 들어가고, 원장이 아닌 예전 학원에서는 나와요
create or replace function public.move_academy(p_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid()); v uuid;
begin
  v := public.join_academy(p_code);
  delete from public.student_links l where l.user_id = uid and l.academy_id <> v;
  delete from public.academy_members m where m.user_id = uid and m.academy_id <> v and m.role <> 'owner';
  return v;
end $$;
grant execute on function public.leave_academy(uuid), public.remove_member(uuid, uuid), public.move_academy(text) to authenticated;

-- 2) 센터 관리자 일정 (직접 넣는 일정 · 할 일. 학원 요청은 화면이 저절로 채워요)
create table if not exists public.center_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  kind text not null default '할 일' check (kind in ('할 일', '회의', '연락', '마감', '행사', '기타')),
  day date not null,
  end_day date check (end_day is null or end_day >= day),
  start_time time, end_time time,
  detail text check (char_length(detail) <= 1000),
  color text check (color is null or color in ('blue','sky','teal','green','lime','yellow','orange','red','pink','purple')),
  done boolean not null default false,
  created_by uuid default auth.uid(),
  created_by_name text,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
alter table public.center_events enable row level security;
create policy "센터 관리자만 봐요" on public.center_events for select to authenticated using (private.is_center_admin());
create policy "센터 관리자만 넣어요" on public.center_events for insert to authenticated with check (private.is_center_admin());
create policy "센터 관리자만 고쳐요" on public.center_events for update to authenticated using (private.is_center_admin());
create policy "센터 관리자만 지워요" on public.center_events for delete to authenticated using (private.is_center_admin());
grant select, insert, update, delete on public.center_events to authenticated;
create or replace function private.center_event_stamp() returns trigger language plpgsql security definer set search_path = ''
as $$
declare n text := (select coalesce(p.name, p.username) from public.profiles p where p.id = (select auth.uid()));
begin
  if tg_op = 'INSERT' then new.created_by := (select auth.uid()); new.created_by_name := n;
  else new.updated_by_name := n; new.updated_at := now(); new.created_by := old.created_by; new.created_by_name := old.created_by_name; end if;
  return new;
end $$;
create trigger center_events_stamp before insert or update on public.center_events for each row execute function private.center_event_stamp();

-- 3) 채팅: 파일 · 사진 묶음(한 번에 10개까지) + 읽음 표시
alter table public.messages add column if not exists files jsonb not null default '[]'
  check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 10);
grant insert (files) on public.messages to authenticated;
grant select (files) on public.messages to authenticated;
-- 경로 첫 폴더가 uuid면 돌려줘요 (아니면 null)
create or replace function private.path_uuid(p text) returns uuid language plpgsql immutable set search_path = ''
as $$ begin return (storage.foldername(p))[1]::uuid; exception when others then return null; end $$;
insert into storage.buckets (id, name, public, file_size_limit) values ('chat', 'chat', false, 20971520) on conflict (id) do nothing;
create policy "채팅 파일 읽기 (대화방 사람)" on storage.objects for select to authenticated using (bucket_id = 'chat' and private.in_conversation(private.path_uuid(name)));
create policy "채팅 파일 올리기 (대화방 사람)" on storage.objects for insert to authenticated with check (bucket_id = 'chat' and private.can_send(private.path_uuid(name)));
-- 대화방 사람마다 언제까지 읽었는지 (카톡처럼 "읽음" · 안 읽은 사람 수)
create or replace function public.conversation_read_state(p_conv uuid)
returns table(user_id uuid, joined_at timestamptz, read_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, m.joined_at, r.read_at from public.conversation_members m
  left join public.conversation_reads r on r.conversation_id = m.conversation_id and r.user_id = m.user_id
  where m.conversation_id = p_conv and private.in_conversation(p_conv);
$$;
grant execute on function public.conversation_read_state(uuid) to authenticated;

-- 4) 채팅 친구: 같은 학원에서 이야기할 수 있는 사람은 미리 친구로 (auto = 학원 사람)
drop function if exists public.my_friends();
create function public.my_friends()
returns table(user_id uuid, name text, role text, academy_name text, kids text, avatar_url text, status_msg text, can_message boolean, auto boolean)
language sql stable security definer set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  acad as (
    select distinct m2.user_id from public.academy_members m1 join public.academy_members m2 on m2.academy_id = m1.academy_id, me
    where m1.user_id = me.id and m2.user_id <> me.id and private.message_academy(me.id, m2.user_id) is not null),
  everyone as (
    select f.friend_id as uid, false as auto from public.friends f, me where f.user_id = me.id
    union select a.user_id, true from acad a where not exists (select 1 from public.friends f, me where f.user_id = me.id and f.friend_id = a.user_id))
  select r.*, private.message_academy((select id from me), e.uid) is not null, e.auto
  from everyone e
  cross join lateral private.person_row(e.uid, coalesce(private.message_academy((select id from me), e.uid),
    (select m.academy_id from public.academy_members m where m.user_id = e.uid order by m.created_at limit 1))) r
  order by array_position(array['admin', 'owner', 'teacher', 'parent', 'student'], r.role), r.name
  limit 800;
$$;
grant execute on function public.my_friends() to authenticated;

-- 5) 공지 사진 (10장까지) — 비공개 버킷 notices, 경로 학원 id/…
alter table public.notices add column if not exists images jsonb not null default '[]'
  check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 10);
grant insert (images) on public.notices to authenticated;
grant update (images) on public.notices to authenticated;
grant select (images) on public.notices to authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('notices', 'notices', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif']) on conflict (id) do nothing;
create policy "공지 사진 읽기 (학원 사람)" on storage.objects for select to authenticated using (bucket_id = 'notices' and private.academy_role(private.path_uuid(name)) is not null);
create policy "공지 사진 올리기 (공지 권한)" on storage.objects for insert to authenticated with check (bucket_id = 'notices' and private.can_do(private.path_uuid(name), 'notices'));
create policy "공지 사진 지우기 (공지 권한)" on storage.objects for delete to authenticated using (bucket_id = 'notices' and private.can_do(private.path_uuid(name), 'notices'));

-- 6) 우리 학원 사람들 누가 누구인지: 원장 · 강사는 모두, 학부모 · 학생은 원장 · 강사 이름만 (다른 가족은 숫자만)
create or replace function public.academy_people_list(p_academy uuid)
returns table(user_id uuid, name text, role text, title text, kids text, joined_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, coalesce(p.name, p.username, '이름 없음'), m.role, m.title,
    (select string_agg(s.name, ', ' order by s.name) from public.student_links l join public.students s on s.id = l.student_id where l.user_id = m.user_id and l.academy_id = p_academy),
    m.created_at
  from public.academy_members m left join public.profiles p on p.id = m.user_id
  where m.academy_id = p_academy and private.academy_role(p_academy) is not null
    and (private.academy_role(p_academy) in ('owner', 'teacher') or m.role in ('owner', 'teacher'))
  order by array_position(array['owner', 'teacher', 'parent', 'student'], m.role), m.created_at;
$$;
grant execute on function public.academy_people_list(uuid) to authenticated;

-- 7) 자료실: 고칠 때 파일도 바꿀 수 있게
grant update (file_path, file_name, file_size, mime) on public.library_items to authenticated;

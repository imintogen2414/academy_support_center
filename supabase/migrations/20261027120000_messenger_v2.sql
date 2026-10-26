-- 메신저를 카톡처럼: 친구 추가 · 친구/채팅 두 화면 · 내 프로필(사진 · 상태 메시지) · 그룹 채팅.
-- 아무나 목록에 다 보이지 않게, 이름 · 아이디로 찾아서 친구로 추가한 사람만 친구 목록에 보여요.
-- 누가 누구와 이야기할 수 있는지는 예전처럼 private.message_academy(a, b)가 정해요.

/* ---------- 프로필 사진 · 상태 메시지 ---------- */
alter table public.profiles
  add column avatar_url text check (avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url like '%/storage/v1/object/public/avatars/%')),
  add column status_msg text check (char_length(status_msg) <= 60);
grant update (avatar_url, status_msg) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
create policy "프로필 사진: 내 폴더 보기" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "프로필 사진: 내 폴더 올리기" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "프로필 사진: 내 폴더 지우기" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

/* ---------- 친구 (내가 추가한 사람, 한쪽 방향) ---------- */
create table public.friends (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
comment on table public.friends is '내 친구 목록 (RPC add_friend · remove_friend · my_friends로만)';
alter table public.friends enable row level security;
create policy "내 친구만" on public.friends for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.friends from anon, authenticated;
grant select on public.friends to authenticated;

/* ---------- 그룹 채팅: 대화방 사람 목록 ---------- */
alter table public.conversations
  add column kind text not null default 'direct' check (kind in ('direct', 'group')),
  add column title text check (char_length(title) <= 50),
  add column created_by uuid references auth.users (id) on delete set null;
alter table public.conversations alter column user_a drop not null, alter column user_b drop not null;
alter table public.conversations drop constraint conversations_check;
alter table public.conversations add constraint conversations_kind_check
  check ((kind = 'direct' and user_a is not null and user_b is not null and user_a < user_b) or (kind = 'group' and user_a is null and user_b is null));

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);
comment on table public.conversation_members is '대화방에 있는 사람 (RPC로만 넣고 빼요)';
insert into public.conversation_members (conversation_id, user_id, joined_at)
  select id, user_a, created_at from public.conversations union all select id, user_b, created_at from public.conversations;
alter table public.conversation_members enable row level security;
revoke all on public.conversation_members from anon, authenticated;

create or replace function private.in_conversation(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.conversation_members m where m.conversation_id = cid and m.user_id = (select auth.uid()));
$$;
-- 보낼 수 있는지: 대화방 사람이고, 1:1이면 아직 이야기할 수 있는 사이
create function private.can_send(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.in_conversation(cid) and exists (select 1 from public.conversations c where c.id = cid
    and (c.kind = 'group' or private.message_academy(c.user_a, c.user_b) is not null));
$$;
revoke execute on function private.can_send(uuid) from public, anon;
grant execute on function private.can_send(uuid) to authenticated;

drop policy "내 대화방만" on public.conversations;
create policy "내 대화방만" on public.conversations for select to authenticated using (private.in_conversation(id));
drop policy "내 대화방에 내 이름으로 보내기" on public.messages;
create policy "내 대화방에 내 이름으로 보내기" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.can_send(conversation_id));

-- 사람 정보 한 줄 (이름 · 역할 · 학원 · 아이 · 사진 · 상태 메시지)
create function private.person_row(uid uuid, aid uuid)
returns table (user_id uuid, name text, role text, academy_name text, kids text, avatar_url text, status_msg text)
language sql
stable
security definer
set search_path = ''
as $$
  select uid, coalesce(p.name, p.username, '이름 없음'), private.member_label(uid, aid), a.name,
         (select string_agg(s.name, ', ' order by s.name) from public.student_links l join public.students s on s.id = l.student_id
          where l.user_id = uid and l.academy_id = aid),
         p.avatar_url, p.status_msg
  from (select 1) x left join public.profiles p on p.id = uid left join public.academies a on a.id = aid;
$$;
revoke execute on function private.person_row(uuid, uuid) from public, anon;
grant execute on function private.person_row(uuid, uuid) to authenticated;

/* ---------- RPC ---------- */
-- 이야기할 수 있는 사람 중에서 이름 · 아이디 · 아이 이름으로 찾기 (한 글자 이상, 최대 20명)
drop function public.message_contacts();
create function public.find_people(p_q text)
returns table (user_id uuid, name text, role text, academy_name text, kids text, avatar_url text, status_msg text, is_friend boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id), q as (select trim(coalesce(p_q, '')) as t),
  cand as (
    select distinct m2.user_id from public.academy_members m1 join public.academy_members m2 on m2.academy_id = m1.academy_id, me
    where m1.user_id = me.id
    union
    select u.id from auth.users u join public.center_admins a on a.email = lower(u.email)
    where exists (select 1 from public.academy_members m, me where m.user_id = me.id and m.role = 'owner')
    union
    select m.user_id from public.academy_members m where m.role = 'owner' and private.is_center_admin()
  ),
  ok as (select c.user_id, private.message_academy(me.id, c.user_id) as aid from cand c, me)
  select r.*, exists (select 1 from public.friends f, me where f.user_id = me.id and f.friend_id = r.user_id)
  from ok join public.profiles p on p.id = ok.user_id cross join lateral private.person_row(ok.user_id, ok.aid) r cross join q
  where ok.aid is not null and char_length(q.t) >= 1
    and (r.name ilike '%' || q.t || '%' or p.username = q.t or coalesce(r.kids, '') ilike '%' || q.t || '%')
  order by 2
  limit 20;
$$;

create function public.add_friend(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.message_academy((select auth.uid()), p_user) is null then raise exception 'not_allowed'; end if;
  insert into public.friends (user_id, friend_id) values ((select auth.uid()), p_user) on conflict do nothing;
end;
$$;
create function public.remove_friend(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.friends where user_id = (select auth.uid()) and friend_id = p_user;
$$;
create function public.my_friends()
returns table (user_id uuid, name text, role text, academy_name text, kids text, avatar_url text, status_msg text, can_message boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.*, private.message_academy((select auth.uid()), f.friend_id) is not null
  from public.friends f
  cross join lateral private.person_row(f.friend_id, coalesce(private.message_academy((select auth.uid()), f.friend_id),
    (select m.academy_id from public.academy_members m where m.user_id = f.friend_id order by m.created_at limit 1))) r
  where f.user_id = (select auth.uid())
  order by array_position(array['admin', 'owner', 'teacher', 'parent', 'student'], r.role), r.name
  limit 500;
$$;

-- 1:1 대화: 대화방 사람 목록에도 넣어요
create or replace function public.start_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid()); aid uuid; a uuid; b uuid; cid uuid;
begin
  aid := private.message_academy(me, p_other);
  if aid is null then raise exception 'not_allowed'; end if;
  a := least(me, p_other); b := greatest(me, p_other);
  insert into public.conversations (academy_id, user_a, user_b, created_by) values (aid, a, b, me) on conflict (user_a, user_b) do nothing;
  select id into cid from public.conversations where user_a = a and user_b = b;
  insert into public.conversation_members (conversation_id, user_id) values (cid, a), (cid, b) on conflict do nothing;
  return cid;
end;
$$;

-- 그룹 채팅 만들기: 들어갈 사람은 모두 나와 이야기할 수 있는 사이여야 해요
create function public.create_group(p_title text, p_members uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid()); aid uuid; cid uuid; m uuid;
begin
  if coalesce(array_length(p_members, 1), 0) < 1 or array_length(p_members, 1) > 99 then raise exception 'bad_members'; end if;
  foreach m in array p_members loop
    if m = me or private.message_academy(me, m) is null then raise exception 'not_allowed'; end if;
  end loop;
  aid := private.message_academy(me, p_members[1]);
  insert into public.conversations (academy_id, kind, title, created_by) values (aid, 'group', nullif(left(trim(coalesce(p_title, '')), 50), ''), me) returning id into cid;
  insert into public.conversation_members (conversation_id, user_id, added_by) values (cid, me, me);
  insert into public.conversation_members (conversation_id, user_id, added_by) select cid, x, me from unnest(p_members) x on conflict do nothing;
  return cid;
end;
$$;
create function public.add_group_members(p_conv uuid, p_members uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid()); m uuid;
begin
  if not private.in_conversation(p_conv) or (select kind from public.conversations where id = p_conv) <> 'group' then raise exception 'not_allowed'; end if;
  foreach m in array coalesce(p_members, '{}') loop
    if m <> me and private.message_academy(me, m) is null then raise exception 'not_allowed'; end if;
  end loop;
  insert into public.conversation_members (conversation_id, user_id, added_by) select p_conv, x, me from unnest(p_members) x on conflict do nothing;
end;
$$;
create function public.rename_group(p_conv uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.in_conversation(p_conv) then raise exception 'not_allowed'; end if;
  update public.conversations set title = nullif(left(trim(coalesce(p_title, '')), 50), '') where id = p_conv and kind = 'group';
end;
$$;
-- 그룹 나가기 (마지막 사람이 나가면 방이 지워져요)
create function public.leave_conversation(p_conv uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select kind from public.conversations where id = p_conv) is distinct from 'group' then raise exception 'not_allowed'; end if;
  delete from public.conversation_members where conversation_id = p_conv and user_id = (select auth.uid());
  delete from public.conversations c where c.id = p_conv and not exists (select 1 from public.conversation_members m where m.conversation_id = p_conv);
end;
$$;
-- 대화방 사람들 (방에 있는 사람만)
create function public.conversation_people(p_conv uuid)
returns table (user_id uuid, name text, role text, academy_name text, kids text, avatar_url text, status_msg text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.* from public.conversation_members m join public.conversations c on c.id = m.conversation_id
  cross join lateral private.person_row(m.user_id, c.academy_id) r
  where m.conversation_id = p_conv and private.in_conversation(p_conv)
  order by m.joined_at;
$$;

drop function public.my_conversations();
create function public.my_conversations()
returns table (id uuid, kind text, title text, other_id uuid, other_name text, other_role text, other_avatar text, academy_name text,
               members bigint, last_at timestamptz, last_text text, unread bigint, can_send boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.kind, c.title, o.oid, coalesce(p.name, p.username, '이름 없음'), private.member_label(o.oid, c.academy_id), p.avatar_url, a.name,
         (select count(*) from public.conversation_members x where x.conversation_id = c.id), c.last_at, c.last_text,
         (select count(*) from public.messages m where m.conversation_id = c.id and m.sender_id <> (select auth.uid())
            and m.created_at > greatest(me.joined_at, coalesce((select r.read_at from public.conversation_reads r where r.conversation_id = c.id and r.user_id = (select auth.uid())), '-infinity'))),
         c.kind = 'group' or private.message_academy(c.user_a, c.user_b) is not null
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  cross join lateral (select case when c.kind = 'group' then null when c.user_a = (select auth.uid()) then c.user_b else c.user_a end as oid) o
  left join public.profiles p on p.id = o.oid
  left join public.academies a on a.id = c.academy_id
  where me.user_id = (select auth.uid())
  order by coalesce(c.last_at, c.created_at) desc
  limit 300;
$$;

revoke execute on function public.find_people(text), public.add_friend(uuid), public.remove_friend(uuid), public.my_friends(),
  public.create_group(text, uuid[]), public.add_group_members(uuid, uuid[]), public.rename_group(uuid, text), public.leave_conversation(uuid),
  public.conversation_people(uuid), public.my_conversations() from public, anon;
grant execute on function public.find_people(text), public.add_friend(uuid), public.remove_friend(uuid), public.my_friends(),
  public.create_group(text, uuid[]), public.add_group_members(uuid, uuid[]), public.rename_group(uuid, text), public.leave_conversation(uuid),
  public.conversation_people(uuid), public.my_conversations() to authenticated;

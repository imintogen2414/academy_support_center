-- 17단계: 메신저 (1:1)
-- 대화할 수 있는 짝: 원장↔센터 관리자 · 강사 · 학부모 · 학생, 강사↔강사 · 학부모 · 학생, 학부모↔학생(같은 아이로 연결된 가족만).
-- 학부모끼리 · 학생끼리는 안 돼요. 대화방은 RPC로만 만들고, 메시지는 대화 두 사람만 읽고 써요.

-- 이 사람이 센터 관리자인지 (is_center_admin과 같은 기준, 사람을 넘겨받아요)
create function private.user_is_center_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u join public.center_admins a on a.email = lower(u.email)
    where u.id = uid
      and (lower(u.email) like '%@id.academysupportcenter.app'
           or exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google'
                      and lower(i.identity_data ->> 'email') = a.email)));
$$;
revoke execute on function private.user_is_center_admin(uuid) from public, anon;
grant execute on function private.user_is_center_admin(uuid) to authenticated;

-- 두 사람이 대화할 수 있으면 그 학원(관리자 ↔ 원장은 원장의 첫 학원), 아니면 null
create function private.message_academy(a uuid, b uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case when a is null or b is null or a = b then null else coalesce(
    (select ma.academy_id from public.academy_members ma
       join public.academy_members mb on mb.academy_id = ma.academy_id and mb.user_id = b
     where ma.user_id = a and (
       ma.role = 'owner' or mb.role = 'owner'
       or (ma.role = 'teacher' and mb.role in ('teacher', 'parent', 'student'))
       or (mb.role = 'teacher' and ma.role in ('parent', 'student'))
       or (ma.role in ('parent', 'student') and mb.role in ('parent', 'student') and ma.role <> mb.role
           and exists (select 1 from public.student_links la join public.student_links lb on lb.student_id = la.student_id
                       where la.user_id = a and lb.user_id = b)))
     order by ma.created_at limit 1),
    (select m.academy_id from public.academy_members m
     where m.role = 'owner' and ((m.user_id = b and private.user_is_center_admin(a)) or (m.user_id = a and private.user_is_center_admin(b)))
     order by m.created_at limit 1)) end;
$$;
revoke execute on function private.message_academy(uuid, uuid) from public, anon;
grant execute on function private.message_academy(uuid, uuid) to authenticated;

/* ---------- 표 ---------- */
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid references public.academies (id) on delete cascade,
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  last_at timestamptz,
  last_text text,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index conversations_user_b_idx on public.conversations (user_b);
comment on table public.conversations is '1:1 대화방 (RPC start_conversation으로만 만들어요)';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages (conversation_id, created_at);
comment on table public.messages is '메시지 (대화 두 사람만)';

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
comment on table public.conversation_reads is '어디까지 읽었는지 (RPC mark_conversation_read로만)';

create function private.in_conversation(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.conversations c where c.id = cid and (select auth.uid()) in (c.user_a, c.user_b));
$$;
revoke execute on function private.in_conversation(uuid) from public, anon;
grant execute on function private.in_conversation(uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;
create policy "내 대화방만" on public.conversations for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy "내 대화방 메시지만 읽기" on public.messages for select to authenticated
  using (private.in_conversation(conversation_id));
-- 보낼 때도 두 사람이 아직 대화할 수 있는 사이인지 확인 (학원을 나가면 못 보내요)
create policy "내 대화방에 내 이름으로 보내기" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and exists (
    select 1 from public.conversations c where c.id = conversation_id and (select auth.uid()) in (c.user_a, c.user_b)
      and private.message_academy(c.user_a, c.user_b) is not null));
create policy "내 읽음 기록만" on public.conversation_reads for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.conversations, public.messages, public.conversation_reads from anon, authenticated;
grant select on public.conversations, public.messages, public.conversation_reads to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;

-- 보내면 대화방 목록에 마지막 메시지 · 시각, 보낸 사람은 읽음 처리
create function private.after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_at = new.created_at, last_text = left(new.body, 100) where id = new.conversation_id;
  insert into public.conversation_reads (conversation_id, user_id, read_at) values (new.conversation_id, new.sender_id, new.created_at)
    on conflict (conversation_id, user_id) do update set read_at = excluded.read_at;
  return new;
end;
$$;
revoke execute on function private.after_message() from public, anon, authenticated;
create trigger messages_after after insert on public.messages for each row execute function private.after_message();

/* ---------- RPC ---------- */
-- 이 사람 역할 (그 학원에서, 관리자면 admin)
create function private.member_label(uid uuid, aid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select m.role from public.academy_members m where m.user_id = uid and m.academy_id = aid),
                  case when private.user_is_center_admin(uid) then 'admin' end);
$$;
revoke execute on function private.member_label(uuid, uuid) from public, anon;
grant execute on function private.member_label(uuid, uuid) to authenticated;

-- 내가 대화할 수 있는 사람들 (학부모 · 학생은 연결된 아이 이름도)
create function public.message_contacts()
returns table (user_id uuid, name text, role text, academy_name text, kids text)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
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
  select ok.user_id, coalesce(p.name, p.username, '이름 없음'), private.member_label(ok.user_id, ok.aid), a.name,
         (select string_agg(s.name, ', ' order by s.name) from public.student_links l join public.students s on s.id = l.student_id
          where l.user_id = ok.user_id and l.academy_id = ok.aid)
  from ok
  left join public.profiles p on p.id = ok.user_id
  left join public.academies a on a.id = ok.aid
  where ok.aid is not null
  order by array_position(array['admin', 'owner', 'teacher', 'parent', 'student'], private.member_label(ok.user_id, ok.aid)), 2
  limit 500;
$$;

-- 대화방 열기 (있으면 그 방)
create function public.start_conversation(p_other uuid)
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
  insert into public.conversations (academy_id, user_a, user_b) values (aid, a, b) on conflict (user_a, user_b) do nothing;
  select id into cid from public.conversations where user_a = a and user_b = b;
  return cid;
end;
$$;

-- 내 대화방 목록 + 안 읽은 수
create function public.my_conversations()
returns table (id uuid, other_id uuid, other_name text, other_role text, academy_name text, last_at timestamptz, last_text text, unread bigint, can_send boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, o.oid, coalesce(p.name, p.username, '이름 없음'), private.member_label(o.oid, c.academy_id), a.name, c.last_at, c.last_text,
         (select count(*) from public.messages m where m.conversation_id = c.id and m.sender_id <> (select auth.uid())
            and m.created_at > coalesce((select r.read_at from public.conversation_reads r where r.conversation_id = c.id and r.user_id = (select auth.uid())), '-infinity')),
         private.message_academy(c.user_a, c.user_b) is not null
  from public.conversations c
  cross join lateral (select case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end as oid) o
  left join public.profiles p on p.id = o.oid
  left join public.academies a on a.id = c.academy_id
  where (select auth.uid()) in (c.user_a, c.user_b)
  order by c.last_at desc nulls last, c.created_at desc
  limit 300;
$$;

create function public.mark_conversation_read(p_conv uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.in_conversation(p_conv) then raise exception 'not_allowed'; end if;
  insert into public.conversation_reads (conversation_id, user_id, read_at) values (p_conv, (select auth.uid()), now())
    on conflict (conversation_id, user_id) do update set read_at = now();
end;
$$;

revoke execute on function public.message_contacts(), public.start_conversation(uuid), public.my_conversations(), public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.message_contacts(), public.start_conversation(uuid), public.my_conversations(), public.mark_conversation_read(uuid) to authenticated;

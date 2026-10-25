-- 5단계: 센터 관리자 · 강사 교육 영상 · 리플렉션 · 지원 신청 보기
-- 센터 관리자는 이메일(구글 계정) 또는 아이디로 정하고, 관리자가 다른 관리자를 추가해요.

/* ---------- 센터 관리자 ---------- */
create table public.center_admins (
  email text primary key check (email = lower(email) and email like '%_@_%'),
  name text check (char_length(name) <= 50),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.center_admins is '센터 관리자 (직접 읽기·쓰기 막힘, RPC로만)';
alter table public.center_admins enable row level security;
revoke all on public.center_admins from anon, authenticated;

-- 첫 관리자 두 명 (대표님 지정)
insert into public.center_admins (email, name) values
  ('yunji040615@gmail.com', '박윤지'),
  ('imintogen2414@gmail.com', null);

-- 지금 로그인한 사람이 센터 관리자인지.
-- 비밀번호 가입은 이메일 확인이 꺼져 있어 남의 이메일로도 가입할 수 있으니,
-- 구글 로그인으로 확인된 이메일이거나 센터 아이디(내부 이메일)일 때만 인정해요.
create function private.is_center_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    join public.center_admins a on a.email = lower(u.email)
    where u.id = (select auth.uid())
      and (lower(u.email) like '%@id.academysupportcenter.app'
           or exists (select 1 from auth.identities i
                      where i.user_id = u.id and i.provider = 'google'
                        and lower(i.identity_data ->> 'email') = a.email))
  );
$$;
revoke execute on function private.is_center_admin() from public, anon;
grant execute on function private.is_center_admin() to authenticated;

-- 화면에서 쓰는 확인용
create function public.am_center_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_center_admin(); $$;

create function public.list_center_admins()
returns table (email text, name text, joined boolean, added_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.email, a.name, exists (select 1 from auth.users u where lower(u.email) = a.email), a.created_at
  from public.center_admins a
  where private.is_center_admin()
  order by a.created_at, a.email;
$$;

-- 관리자 추가: 이메일(구글 계정) 또는 이미 가입한 아이디
create function public.add_center_admin(p_who text, p_name text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare em text := lower(trim(coalesce(p_who, '')));
begin
  if not private.is_center_admin() then raise exception 'admin_only'; end if;
  if position('@' in em) = 0 then
    if em !~ '^[a-z0-9_]{4,20}$' then raise exception 'bad_id'; end if;
    em := em || '@id.academysupportcenter.app';
    if not exists (select 1 from auth.users where lower(email) = em) then raise exception 'no_such_id'; end if;
  elsif em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(em) > 200 then
    raise exception 'bad_email';
  end if;
  insert into public.center_admins (email, name, added_by)
    values (em, nullif(left(trim(coalesce(p_name, '')), 50), ''), (select auth.uid()))
  on conflict (email) do update set name = coalesce(excluded.name, public.center_admins.name);
  return em;
end;
$$;

-- 관리자 빼기 (나 자신은 뺄 수 없어요 — 관리자가 아무도 없게 되는 걸 막아요)
create function public.remove_center_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_center_admin() then raise exception 'admin_only'; end if;
  if lower(p_email) = (select lower(email) from auth.users where id = (select auth.uid())) then
    raise exception 'cannot_remove_self';
  end if;
  delete from public.center_admins where email = lower(p_email);
end;
$$;

/* ---------- 학원 원장·강사인지 (정책용) ---------- */
create function private.is_academy_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.academy_members
                 where user_id = (select auth.uid()) and role in ('owner', 'teacher'));
$$;
revoke execute on function private.is_academy_staff() from public, anon;
grant execute on function private.is_academy_staff() to authenticated;

/* ---------- 강사 교육 영상 (센터 본부가 배부) ---------- */
create table public.training_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  category text not null default '수업' check (category in ('필수', '수업', '상담', '운영')),
  description text check (char_length(description) <= 1000),
  video_url text check (char_length(video_url) <= 500 and video_url ~ '^https://'),
  length text check (char_length(length) <= 10),   -- 예: 18:30
  due date,
  published boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
comment on table public.training_videos is '강사 교육 영상 (센터 관리자가 올림)';
alter table public.training_videos enable row level security;

create policy "원장·강사는 배부된 영상을, 관리자는 전부 볼 수 있음" on public.training_videos for select to authenticated
  using ((published and private.is_academy_staff()) or private.is_center_admin());
create policy "관리자만 영상을 올림" on public.training_videos for insert to authenticated
  with check (private.is_center_admin());
create policy "관리자만 영상을 고침" on public.training_videos for update to authenticated
  using (private.is_center_admin()) with check (private.is_center_admin());
create policy "관리자만 영상을 삭제" on public.training_videos for delete to authenticated
  using (private.is_center_admin());

revoke all on public.training_videos from anon, authenticated;
grant select, delete on public.training_videos to authenticated;
grant insert (title, category, description, video_url, length, due, published) on public.training_videos to authenticated;
grant update (title, category, description, video_url, length, due, published) on public.training_videos to authenticated;

/* ---------- 리플렉션 = 시청 후 소감 (쓰면 이수 완료) ---------- */
create table public.training_reflections (
  video_id uuid not null references public.training_videos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (video_id, user_id)
);
create index training_reflections_user_idx on public.training_reflections (user_id);
comment on table public.training_reflections is '강사 교육 리플렉션 (한 영상에 한 사람 하나)';
alter table public.training_reflections enable row level security;

create policy "내 리플렉션과, 관리자는 전부 볼 수 있음" on public.training_reflections for select to authenticated
  using (user_id = (select auth.uid()) or private.is_center_admin());
create policy "원장·강사는 배부된 영상에 내 리플렉션을 씀" on public.training_reflections for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_academy_staff()
              and exists (select 1 from public.training_videos v where v.id = video_id and v.published));
create policy "내 리플렉션만 고침" on public.training_reflections for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.training_reflections from anon, authenticated;
grant select on public.training_reflections to authenticated;
grant insert (video_id, body) on public.training_reflections to authenticated;
grant update (body) on public.training_reflections to authenticated;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$ begin new.updated_at := now(); return new; end; $$;
revoke execute on function private.touch_updated_at() from public, anon, authenticated;
create trigger training_reflections_touch before update on public.training_reflections
  for each row execute function private.touch_updated_at();

-- 원장: 우리 학원 강사들의 이수 현황 (강사마다, 리플렉션마다 한 줄 · 리플렉션이 없으면 video_id가 비어요)
create function public.academy_training_report(p_academy uuid)
returns table (teacher_id uuid, teacher_name text, joined_at timestamptz, video_id uuid, body text, done_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, coalesce(p.name, p.username, '이름 없음'), m.created_at, r.video_id, r.body, r.created_at
  from public.academy_members m
  left join public.profiles p on p.id = m.user_id
  left join public.training_reflections r on r.user_id = m.user_id
  where m.academy_id = p_academy and m.role = 'teacher' and private.academy_role(p_academy) = 'owner'
  order by m.created_at, r.created_at;
$$;

-- 관리자: 영상 하나의 리플렉션을 쓴 사람 이름 · 학원과 함께
create function public.admin_video_reflections(p_video uuid)
returns table (name text, academies text, body text, done_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.name, p.username, '이름 없음'),
         (select string_agg(a.name, ', ' order by a.name) from public.academy_members m
            join public.academies a on a.id = m.academy_id where m.user_id = r.user_id),
         r.body, r.created_at
  from public.training_reflections r
  left join public.profiles p on p.id = r.user_id
  where r.video_id = p_video and private.is_center_admin()
  order by r.created_at desc;
$$;

/* ---------- 지원 신청: 이제 관리자 화면에서 보고 처리해요 ---------- */
alter table public.support_requests add column admin_memo text check (char_length(admin_memo) <= 1000);
create policy "관리자는 지원 신청을 볼 수 있음" on public.support_requests for select to authenticated
  using (private.is_center_admin());
create policy "관리자는 지원 신청을 처리" on public.support_requests for update to authenticated
  using (private.is_center_admin()) with check (private.is_center_admin());
grant select on public.support_requests to authenticated;
grant update (status, admin_memo) on public.support_requests to authenticated;

revoke execute on function public.am_center_admin(), public.list_center_admins(), public.add_center_admin(text, text),
  public.remove_center_admin(text), public.academy_training_report(uuid), public.admin_video_reflections(uuid) from public, anon;
grant execute on function public.am_center_admin(), public.list_center_admins(), public.add_center_admin(text, text),
  public.remove_center_admin(text), public.academy_training_report(uuid), public.admin_video_reflections(uuid) to authenticated;

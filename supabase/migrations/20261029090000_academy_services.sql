-- 분야별 이용: 학원마다 이용하는 센터 지원 분야(행정 · 강사 · 학생·학부모 · 제휴 · 홍보)를 켜고 꺼요
-- 원생 명단 · 출결 · 일정 · 메신저 같은 기본 프로그램은 누구나 쓰고, 센터가 직접 해 주는 지원만 분야가 켜져 있어야 해요.
-- 1) academy_services: 학원 × 분야 → 상담 중(consulting) / 이용 중(active) / 종료(ended). 줄이 없으면 신청 전
-- 2) 지원 신청과 학원 잇기: 원장이 프로그램 안에서 분야를 더 신청하거나, 첫 화면 접수 번호로 이어요
-- 3) center_tasks "센터에 맡기기": 이용 중인 분야의 일을 센터에 맡겨요 (서류 대신 작성 · 명단 옮기기 · 채용 대행 …)
-- 4) 분야가 꺼져 있으면 제휴 신청 · 유학 안내 · 홍보 의뢰 · 채용 공고 · 강사 교육 영상도 DB에서 막아요

/* ---------- 1) 학원별 이용 분야 ---------- */
create table public.academy_services (
  academy_id uuid not null references public.academies (id) on delete cascade,
  area text not null check (area in ('admin', 'teachers', 'members', 'mou', 'promo')),
  status text not null default 'consulting' check (status in ('consulting', 'active', 'ended')),
  started_at date,
  updated_at timestamptz not null default now(),
  primary key (academy_id, area)
);
comment on table public.academy_services is '학원별 이용 분야. 줄이 없으면 신청 전. 쓰기는 관리자 set_academy_service, 원장 request_academy_services · claim_support_request';
alter table public.academy_services enable row level security;
create policy "이용 분야 보기: 우리 학원 · 관리자" on public.academy_services for select to authenticated
  using (private.academy_role(academy_id) is not null or private.is_center_admin());
revoke all on public.academy_services from anon, authenticated;
grant select on public.academy_services to authenticated;

-- 지금 있는 학원은 지금처럼 다 쓸 수 있게 다섯 분야 모두 이용 중으로
insert into public.academy_services (academy_id, area, status, started_at)
  select a.id, x.area, 'active', a.created_at::date from public.academies a
  cross join (values ('admin'), ('teachers'), ('members'), ('mou'), ('promo')) as x(area);

-- 이 학원이 이 분야를 쓰고 있나
create function private.has_service(p_academy uuid, p_area text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from public.academy_services where academy_id = p_academy and area = p_area and status = 'active'); $$;
revoke execute on function private.has_service(uuid, text) from public, anon;
grant execute on function private.has_service(uuid, text) to authenticated;

-- 내가 원장 · 강사인 학원 중 한 곳이라도 이 분야를 쓰나 (학원을 가리지 않는 강사 교육 영상용)
create function private.my_service(p_area text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.academy_members m join public.academy_services s on s.academy_id = m.academy_id
    where m.user_id = (select auth.uid()) and m.role in ('owner', 'teacher') and s.area = p_area and s.status = 'active');
$$;
revoke execute on function private.my_service(text) from public, anon;
grant execute on function private.my_service(text) to authenticated;

-- 신청서의 분야 이름 → 분야 id
create function private.area_id(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name like '행정%' then 'admin' when p_name like '강사%' then 'teachers'
    when p_name like '학생%' then 'members' when p_name like '제휴%' then 'mou'
    when p_name like '홍보%' then 'promo' end;
$$;

/* ---------- 2) 지원 신청 ↔ 학원 ---------- */
alter table public.support_requests add column academy_id uuid references public.academies (id) on delete set null;
create index support_requests_academy_idx on public.support_requests (academy_id);

-- 신청한 분야를 "상담 중"으로 (이미 이용 중이면 그대로)
create function private.mark_consulting(p_academy uuid, p_areas text[])
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.academy_services (academy_id, area, status)
    select p_academy, a, 'consulting' from unnest(p_areas) a where a in ('admin', 'teachers', 'members', 'mou', 'promo')
  on conflict (academy_id, area) do update set status = 'consulting', updated_at = now()
    where public.academy_services.status = 'ended';
$$;
revoke execute on function private.mark_consulting(uuid, text[]) from public, anon, authenticated;

-- 원장: 프로그램 안에서 분야 더 신청하기 → 센터 "지원 신청"에 학원과 이어진 채로 들어가요
create function public.request_academy_services(p_academy uuid, p_areas text[], p_phone text, p_contact_time text, p_memo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid; a public.academies; v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_names text[];
begin
  if private.academy_role(p_academy) is distinct from 'owner' then raise exception 'not_allowed'; end if;
  if v_phone !~ '^0[0-9]{8,10}$' then raise exception 'bad_phone'; end if;
  select array_agg(n order by o) into v_names from unnest(p_areas) with ordinality as u(x, o)
    cross join lateral (select case x when 'admin' then '행정 지원' when 'teachers' then '강사 관리' when 'members' then '학생·학부모 관리'
      when 'mou' then '제휴(MOU)' when 'promo' then '홍보 지원' end as n) m where n is not null;
  if coalesce(array_length(v_names, 1), 0) = 0 then raise exception 'need_required'; end if;
  select * into a from public.academies where id = p_academy;
  insert into public.support_requests (academy_id, academy_name, region, owner_name, phone, needs, memo, contact_time)
  values (p_academy, a.name, a.region,
    left(coalesce((select coalesce(p.name, p.username) from public.profiles p where p.id = (select auth.uid())), '원장'), 50),
    left(trim(p_phone), 30), v_names[1:5], nullif(left(trim(coalesce(p_memo, '')), 2000), ''), nullif(left(trim(coalesce(p_contact_time, '')), 30), ''))
  returning id into v_id;
  perform private.mark_consulting(p_academy, p_areas);
  return upper(left(replace(v_id::text, '-', ''), 8));
end;
$$;
revoke execute on function public.request_academy_services(uuid, text[], text, text, text) from public, anon;
grant execute on function public.request_academy_services(uuid, text[], text, text, text) to authenticated;

-- 원장: 첫 화면에서 받은 접수 번호(8자리)로 신청을 우리 학원과 이어요 (최근 180일, 아직 안 이어진 것만)
create function public.claim_support_request(p_academy uuid, p_no text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare r public.support_requests; v_areas text[];
begin
  if private.academy_role(p_academy) is distinct from 'owner' then raise exception 'not_allowed'; end if;
  select * into r from public.support_requests
    where upper(left(replace(id::text, '-', ''), 8)) = upper(trim(coalesce(p_no, ''))) and created_at > now() - interval '180 days'
    limit 1;
  if r.id is null then raise exception 'not_found'; end if;
  if r.academy_id is not null and r.academy_id <> p_academy then raise exception 'already_linked'; end if;
  update public.support_requests set academy_id = p_academy where id = r.id;
  select array_agg(distinct private.area_id(n)) filter (where private.area_id(n) is not null) into v_areas from unnest(r.needs) n;
  perform private.mark_consulting(p_academy, coalesce(v_areas, '{}'));
  return coalesce(v_areas, '{}');
end;
$$;
revoke execute on function public.claim_support_request(uuid, text) from public, anon;
grant execute on function public.claim_support_request(uuid, text) to authenticated;

-- 관리자: 학원 목록 (원장 이름 · 사람 수 · 이용 분야)
create function public.admin_academies()
returns table (id uuid, name text, region text, created_at timestamptz, owners text, teachers int, students int, services jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, a.region, a.created_at,
    (select string_agg(coalesce(p.name, p.username), ', ') from public.academy_members m left join public.profiles p on p.id = m.user_id
      where m.academy_id = a.id and m.role = 'owner'),
    (select count(*)::int from public.academy_members m where m.academy_id = a.id and m.role = 'teacher'),
    (select count(*)::int from public.students s where s.academy_id = a.id),
    coalesce((select jsonb_object_agg(s.area, jsonb_build_object('status', s.status, 'started_at', s.started_at))
      from public.academy_services s where s.academy_id = a.id), '{}')
  from public.academies a
  where private.is_center_admin()
  order by a.created_at desc;
$$;
revoke execute on function public.admin_academies() from public, anon;
grant execute on function public.admin_academies() to authenticated;

-- 관리자: 학원 분야 상태 바꾸기 (null이면 신청 전으로)
create function public.set_academy_service(p_academy uuid, p_area text, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_center_admin() then raise exception 'not_allowed'; end if;
  if p_area not in ('admin', 'teachers', 'members', 'mou', 'promo') then raise exception 'bad_area'; end if;
  if p_status is null then
    delete from public.academy_services where academy_id = p_academy and area = p_area;
    return;
  end if;
  if p_status not in ('consulting', 'active', 'ended') then raise exception 'bad_status'; end if;
  insert into public.academy_services (academy_id, area, status, started_at)
    values (p_academy, p_area, p_status, case when p_status = 'active' then current_date end)
  on conflict (academy_id, area) do update set status = excluded.status, updated_at = now(),
    started_at = case when excluded.status = 'active' and public.academy_services.status <> 'active' then current_date else public.academy_services.started_at end;
end;
$$;
revoke execute on function public.set_academy_service(uuid, text, text) from public, anon;
grant execute on function public.set_academy_service(uuid, text, text) to authenticated;

/* ---------- 3) 센터에 맡기기 ---------- */
create table public.center_tasks (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  academy_name text,
  area text not null check (area in ('admin', 'teachers', 'members')),
  kind text not null check (char_length(kind) between 1 and 60),
  detail text check (char_length(detail) <= 2000),
  due date,
  status text not null default 'new' check (status in ('new', 'working', 'done', 'closed')),
  admin_memo text check (char_length(admin_memo) <= 1000),
  requested_by uuid references auth.users (id) on delete set null,
  requester_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz
);
create index center_tasks_academy_idx on public.center_tasks (academy_id, created_at desc);
comment on table public.center_tasks is '센터에 맡기기: 이용 중인 분야의 일을 원장이 센터에 맡겨요. 관리자가 new→working→done';
alter table public.center_tasks enable row level security;
create policy "맡긴 일 보기: 원장 · 관리자" on public.center_tasks for select to authenticated
  using (private.academy_role(academy_id) = 'owner' or private.is_center_admin());
create policy "맡긴 일 넣기: 이용 중인 분야 원장" on public.center_tasks for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner' and private.has_service(academy_id, area));
create policy "맡긴 일 고치기: 원장(접수 단계)" on public.center_tasks for update to authenticated
  using (private.academy_role(academy_id) = 'owner' and status = 'new')
  with check (private.academy_role(academy_id) = 'owner' and status = 'new');
create policy "맡긴 일 처리: 관리자" on public.center_tasks for update to authenticated
  using (private.is_center_admin()) with check (private.is_center_admin());
create policy "맡긴 일 취소: 원장(접수 단계)" on public.center_tasks for delete to authenticated
  using (private.academy_role(academy_id) = 'owner' and status = 'new');
revoke all on public.center_tasks from anon, authenticated;
grant select, insert, delete on public.center_tasks to authenticated;
grant update (kind, detail, due, status, admin_memo) on public.center_tasks to authenticated;

create function private.fill_center_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.requested_by := (select auth.uid());
    select coalesce(p.name, p.username) into new.requester_name from public.profiles p where p.id = new.requested_by;
    select a.name into new.academy_name from public.academies a where a.id = new.academy_id;
    new.status := 'new'; new.admin_memo := null; new.done_at := null;
  else
    -- 원장은 내용만, 상태 · 메모는 관리자만
    if not private.is_center_admin() then new.status := old.status; new.admin_memo := old.admin_memo; end if;
    new.academy_id := old.academy_id; new.area := old.area; new.requested_by := old.requested_by;
    new.updated_at := now();
    new.done_at := case when new.status = 'done' and old.status <> 'done' then now() when new.status <> 'done' then null else old.done_at end;
  end if;
  return new;
end;
$$;
create trigger center_tasks_fill before insert or update on public.center_tasks
  for each row execute function private.fill_center_task();

/* ---------- 4) 꺼진 분야는 DB에서도 막아요 ---------- */
alter policy "제휴 신청: 원장 · 강사" on public.partner_applications
  with check (private.academy_role(academy_id) in ('owner', 'teacher') and private.has_service(academy_id, 'mou'));
alter policy "원장만 홍보를 올림" on public.abroad_promos
  with check (private.academy_role(academy_id) = 'owner' and private.has_service(academy_id, 'mou'));
alter policy "유학 상담 신청: 가족 · 원장 · 강사(대신)" on public.abroad_requests
  with check (user_id = (select auth.uid()) and private.academy_role(academy_id) in ('parent', 'student', 'owner', 'teacher')
    and private.has_service(academy_id, 'mou'));
alter policy "원장·강사가 홍보를 의뢰" on public.promo_requests
  with check (private.academy_role(academy_id) in ('owner', 'teacher') and private.has_service(academy_id, 'promo'));
alter policy "원장만 공고를 올림" on public.job_posts
  with check (private.academy_role(academy_id) = 'owner' and private.has_service(academy_id, 'teachers'));
alter policy "원장·강사는 배부된 영상을, 관리자는 전부 볼 " on public.training_videos
  using ((published and private.is_academy_staff() and private.my_service('teachers')) or private.is_center_admin());
alter policy "원장·강사는 배부된 영상에 내 리플렉션을 씀" on public.training_reflections
  with check (user_id = (select auth.uid()) and private.is_academy_staff() and private.my_service('teachers')
    and exists (select 1 from public.training_videos v where v.id = training_reflections.video_id and v.published));

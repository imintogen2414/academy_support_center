-- 7단계 테이블: 학부모·학생 앱 — 원생 연결 · 학부모 공지(읽음 확인) · 홍보 의뢰(인투마케팅 연결)
-- 학부모·학생은 원장이 "원생 명단"에서 이어 준 아이의 출결 · 수납만 봐요.

/* ---------- 원생 ↔ 학부모·학생 계정 연결 ---------- */
create table public.student_links (
  student_id uuid not null references public.students (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, user_id)
);
create index student_links_user_idx on public.student_links (user_id);
create index student_links_academy_idx on public.student_links (academy_id);
comment on table public.student_links is '원생과 학부모·학생 계정 연결 (원장이 link_family로 연결)';

alter table public.student_links enable row level security;
create policy "내 연결과, 원장은 우리 학원 연결을 볼 수 있음" on public.student_links for select to authenticated
  using (user_id = (select auth.uid()) or private.academy_role(academy_id) = 'owner');
revoke all on public.student_links from anon, authenticated;
grant select on public.student_links to authenticated;

-- 이 원생이 내 아이(또는 나)인지
create function private.is_my_child(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.student_links where student_id = sid and user_id = (select auth.uid()));
$$;
-- 내 아이 중에 이 반 학생이 있는지 (반 공지용)
create function private.child_in_class(aid uuid, cls text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.student_links l join public.students s on s.id = l.student_id
    where l.user_id = (select auth.uid()) and l.academy_id = aid and s.class_name = cls
  );
$$;
revoke execute on function private.is_my_child(uuid), private.child_in_class(uuid, text) from public, anon;
grant execute on function private.is_my_child(uuid), private.child_in_class(uuid, text) to authenticated;

-- 원장: 우리 학원 학부모·학생 계정과 연결된 원생
create function public.list_family_members(p_academy uuid)
returns table (user_id uuid, name text, role text, joined_at timestamptz, students uuid[])
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, coalesce(p.name, p.username, '이름 없음'), m.role, m.created_at,
    coalesce(array_agg(l.student_id) filter (where l.student_id is not null), '{}')
  from public.academy_members m
  left join public.profiles p on p.id = m.user_id
  left join public.student_links l on l.user_id = m.user_id and l.academy_id = m.academy_id
  where m.academy_id = p_academy and m.role in ('parent', 'student') and private.academy_role(p_academy) = 'owner'
  group by m.user_id, p.name, p.username, m.role, m.created_at
  order by m.role, m.created_at;
$$;

-- 원장: 원생에 학부모·학생 계정을 잇거나(p_on = true) 끊어요
create function public.link_family(p_student uuid, p_user uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  aid uuid := (select academy_id from public.students where id = p_student);
begin
  if aid is null or private.academy_role(aid) is distinct from 'owner' then raise exception 'not_allowed'; end if;
  if p_on then
    if not exists (select 1 from public.academy_members where academy_id = aid and user_id = p_user and role in ('parent', 'student')) then
      raise exception 'not_family';
    end if;
    insert into public.student_links (student_id, user_id, academy_id) values (p_student, p_user, aid)
      on conflict do nothing;
  else
    delete from public.student_links where student_id = p_student and user_id = p_user;
  end if;
end;
$$;

-- 학부모·학생: 연결된 아이 (원장 메모 · 연락처는 빼고)
create function public.my_children()
returns table (id uuid, academy_id uuid, name text, grade text, class_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.academy_id, s.name, s.grade, s.class_name
  from public.student_links l join public.students s on s.id = l.student_id
  where l.user_id = (select auth.uid())
  order by s.name;
$$;

-- 학부모: 연결된 아이의 청구 (원장 메모는 빼고). 학생 계정은 수납을 보지 않아요
create function public.my_child_invoices()
returns table (id uuid, student_id uuid, student_name text, month text, title text, amount integer, due date, paid_at date, method text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.student_id, i.student_name, i.month, i.title, i.amount, i.due, i.paid_at, i.method
  from public.invoices i
  join public.student_links l on l.student_id = i.student_id and l.user_id = (select auth.uid())
  where private.academy_role(i.academy_id) = 'parent'
  order by i.month desc, i.created_at;
$$;

-- 출결: 연결된 학부모·학생도 자기 아이 것은 볼 수 있어요
create policy "학부모·학생은 연결된 아이 출결을 볼 수 있음" on public.attendance for select to authenticated
  using (private.is_my_child(student_id));

/* ---------- 학부모 공지 ---------- */
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  body text check (char_length(body) <= 3000),
  target_class text check (char_length(target_class) <= 50), -- 비어 있으면 전체 학부모
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notices_academy_idx on public.notices (academy_id, created_at desc);
comment on table public.notices is '학부모 공지 (원장 → 학부모·학생 앱)';
create trigger notices_touch before update on public.notices
  for each row execute function private.touch_updated_at();

alter table public.notices enable row level security;
create policy "원장·강사는 우리 공지를, 학부모·학생은 받는 공지를 볼 수 있음" on public.notices for select to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher')
    or (private.academy_role(academy_id) in ('parent', 'student')
        and (target_class is null or private.child_in_class(academy_id, target_class))));
create policy "원장만 공지를 씀" on public.notices for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 공지를 고침" on public.notices for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 공지를 삭제" on public.notices for delete to authenticated
  using (private.academy_role(academy_id) = 'owner');

revoke all on public.notices from anon, authenticated;
grant select, delete on public.notices to authenticated;
grant insert (academy_id, title, body, target_class) on public.notices to authenticated;
grant update (title, body, target_class) on public.notices to authenticated;

/* ---------- 공지 읽음 (mark_notice_read로만) ---------- */
create table public.notice_reads (
  notice_id uuid not null references public.notices (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);
create index notice_reads_user_idx on public.notice_reads (user_id);
comment on table public.notice_reads is '공지 읽음 기록';

alter table public.notice_reads enable row level security;
create policy "내 읽음 기록만 볼 수 있음" on public.notice_reads for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.notice_reads from anon, authenticated;
grant select on public.notice_reads to authenticated;

-- 학부모·학생: 받은 공지를 열면 읽음으로 남겨요
create function public.mark_notice_read(p_notice uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n record;
begin
  select academy_id, target_class into n from public.notices where id = p_notice;
  if not found or coalesce(private.academy_role(n.academy_id), '') not in ('parent', 'student')
     or (n.target_class is not null and not private.child_in_class(n.academy_id, n.target_class)) then
    raise exception 'not_allowed';
  end if;
  insert into public.notice_reads (notice_id, user_id) values (p_notice, (select auth.uid()))
    on conflict do nothing;
end;
$$;

-- 공지를 받는 사람: 전체 공지면 학부모·학생 모두, 반 공지면 그 반 아이와 연결된 사람
create function private.notice_audience(p_notice uuid)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id from public.notices n
  join public.academy_members m on m.academy_id = n.academy_id and m.role in ('parent', 'student')
  where n.id = p_notice
    and (n.target_class is null or exists (
      select 1 from public.student_links l join public.students s on s.id = l.student_id
      where l.user_id = m.user_id and l.academy_id = n.academy_id and s.class_name = n.target_class));
$$;
revoke execute on function private.notice_audience(uuid) from public, anon, authenticated;

-- 원장: 공지마다 받는 사람 수 · 읽은 사람 수
create function public.notice_report(p_academy uuid)
returns table (notice_id uuid, total integer, read integer)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id,
    (select count(*) from private.notice_audience(n.id))::int,
    (select count(*) from private.notice_audience(n.id) a join public.notice_reads r on r.notice_id = n.id and r.user_id = a.user_id)::int
  from public.notices n
  where n.academy_id = p_academy and private.academy_role(p_academy) = 'owner';
$$;

-- 원장: 한 공지를 누가 읽었는지 (안 읽은 사람도 함께)
create function public.notice_readers(p_notice uuid)
returns table (name text, role text, read_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.name, p.username, '이름 없음'), m.role, r.read_at
  from private.notice_audience(p_notice) a
  join public.notices n on n.id = p_notice
  join public.academy_members m on m.academy_id = n.academy_id and m.user_id = a.user_id
  left join public.profiles p on p.id = a.user_id
  left join public.notice_reads r on r.notice_id = p_notice and r.user_id = a.user_id
  where private.academy_role(n.academy_id) = 'owner'
  order by r.read_at nulls first, p.name;
$$;

/* ---------- 홍보 의뢰 (원장 → 센터 → 인투마케팅) ---------- */
create table public.promo_requests (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  academy_name text,
  service text not null check (service in ('블로그 지원', '디자인 지원', '영상 지원', 'SNS · 광고 운영')),
  title text not null check (char_length(title) between 1 and 100),
  detail text check (char_length(detail) <= 2000),
  want_by date,
  contact text check (char_length(contact) <= 50),
  -- 접수 → 인투마케팅 연결 → 작업 중 → 시안 확인 → 완료
  status text not null default 'new' check (status in ('new', 'contacted', 'working', 'review', 'done')),
  admin_memo text check (char_length(admin_memo) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index promo_requests_academy_idx on public.promo_requests (academy_id);
comment on table public.promo_requests is '홍보 의뢰 (원장 → 센터가 인투마케팅에 연결)';
create trigger promo_requests_academy_name before insert on public.promo_requests
  for each row execute function private.fill_academy_name();
create trigger promo_requests_touch before update on public.promo_requests
  for each row execute function private.touch_updated_at();

alter table public.promo_requests enable row level security;
create policy "원장은 우리 의뢰를, 관리자는 전부 볼 수 있음" on public.promo_requests for select to authenticated
  using (private.academy_role(academy_id) = 'owner' or private.is_center_admin());
create policy "원장이 홍보를 의뢰" on public.promo_requests for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "관리자가 홍보 의뢰를 처리" on public.promo_requests for update to authenticated
  using (private.is_center_admin()) with check (private.is_center_admin());
create policy "원장은 접수 단계 의뢰를 취소" on public.promo_requests for delete to authenticated
  using (private.academy_role(academy_id) = 'owner' and status = 'new');

revoke all on public.promo_requests from anon, authenticated;
grant select, delete on public.promo_requests to authenticated;
grant insert (academy_id, service, title, detail, want_by, contact) on public.promo_requests to authenticated;
grant update (status, admin_memo) on public.promo_requests to authenticated;

revoke execute on function public.list_family_members(uuid), public.link_family(uuid, uuid, boolean), public.my_children(),
  public.my_child_invoices(), public.mark_notice_read(uuid), public.notice_report(uuid), public.notice_readers(uuid) from public, anon;
grant execute on function public.list_family_members(uuid), public.link_family(uuid, uuid, boolean), public.my_children(),
  public.my_child_invoices(), public.mark_notice_read(uuid), public.notice_report(uuid), public.notice_readers(uuid) to authenticated;

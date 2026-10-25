-- 6단계: 강사 채용 · 제휴 신청 · 학부모 유학 상담
-- 채용: 원장이 공고 → 센터 채용 게시판 → 강사 지원 → 원장이 처리
-- 제휴: 원장이 신청 → 센터 관리자가 연결
-- 유학: 원장이 학부모에게 홍보 → 학부모 신청 → 원장 확인 → 센터(인투어브로드)에 연결 요청

/* ---------- 도우미 ---------- */
-- 내 프로필 역할 (학원에 아직 속하지 않은 강사도 채용 게시판을 보게)
create function private.my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()); $$;
revoke execute on function private.my_role() from public, anon;
grant execute on function private.my_role() to authenticated;

-- 새 줄에 학원 이름을 적어 둬요 (학원 표는 그 학원 사람만 읽을 수 있어서)
create function private.fill_academy_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.academy_name := (select name from public.academies where id = new.academy_id);
  return new;
end;
$$;
revoke execute on function private.fill_academy_name() from public, anon, authenticated;

/* ---------- 채용 공고 ---------- */
create table public.job_posts (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  academy_name text,
  title text not null check (char_length(title) between 1 and 100),
  job_type text not null default '파트타임' check (job_type in ('파트타임', '전임', '주말', '방학 특강')),
  subject text check (char_length(subject) <= 50),
  pay text check (char_length(pay) <= 50),
  hours text check (char_length(hours) <= 50),
  area text check (char_length(area) <= 100),
  description text check (char_length(description) <= 2000),
  due date,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index job_posts_academy_idx on public.job_posts (academy_id);
comment on table public.job_posts is '강사 채용 공고 (센터 채용 게시판)';
create trigger job_posts_academy_name before insert on public.job_posts
  for each row execute function private.fill_academy_name();

alter table public.job_posts enable row level security;
create policy "강사·원장은 모집 중인 공고를, 원장은 우리 공고를 볼 수 있음" on public.job_posts for select to authenticated
  using ((status = 'open' and private.my_role() in ('teacher', 'owner')) or private.academy_role(academy_id) = 'owner' or private.is_center_admin());
create policy "원장만 공고를 올림" on public.job_posts for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 공고를 고침" on public.job_posts for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 공고를 삭제" on public.job_posts for delete to authenticated
  using (private.academy_role(academy_id) = 'owner');

revoke all on public.job_posts from anon, authenticated;
grant select, delete on public.job_posts to authenticated;
grant insert (academy_id, title, job_type, subject, pay, hours, area, description, due, status) on public.job_posts to authenticated;
grant update (title, job_type, subject, pay, hours, area, description, due, status) on public.job_posts to authenticated;

/* ---------- 지원 ---------- */
create table public.job_applications (
  job_id uuid not null references public.job_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  career text check (char_length(career) <= 200),
  phone text check (char_length(phone) <= 30),
  message text check (char_length(message) <= 1000),
  status text not null default 'applied' check (status in ('applied', 'interview', 'hired', 'declined')),
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);
create index job_applications_user_idx on public.job_applications (user_id);
comment on table public.job_applications is '강사 채용 지원';

-- 이 공고를 올린 학원의 원장인지
create function private.is_job_owner(jid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce((select private.academy_role(academy_id) = 'owner' from public.job_posts where id = jid), false); $$;
revoke execute on function private.is_job_owner(uuid) from public, anon;
grant execute on function private.is_job_owner(uuid) to authenticated;

alter table public.job_applications enable row level security;
create policy "내 지원과, 공고 올린 원장은 지원을 볼 수 있음" on public.job_applications for select to authenticated
  using (user_id = (select auth.uid()) or private.is_job_owner(job_id));
create policy "강사는 모집 중인 공고에 지원" on public.job_applications for insert to authenticated
  with check (user_id = (select auth.uid()) and private.my_role() = 'teacher'
              and exists (select 1 from public.job_posts p where p.id = job_id and p.status = 'open'));
create policy "공고 올린 원장이 지원 상태를 바꿈" on public.job_applications for update to authenticated
  using (private.is_job_owner(job_id)) with check (private.is_job_owner(job_id));
create policy "지원한 강사가 지원을 취소" on public.job_applications for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'applied');

revoke all on public.job_applications from anon, authenticated;
grant select, delete on public.job_applications to authenticated;
grant insert (job_id, career, phone, message) on public.job_applications to authenticated;
grant update (status) on public.job_applications to authenticated;

-- 원장: 우리 학원 공고에 들어온 지원자 (이름 · 센터 교육 이수 수와 함께)
create function public.list_job_applicants(p_academy uuid)
returns table (job_id uuid, user_id uuid, name text, career text, phone text, message text, status text, applied_at timestamptz, trainings_done integer)
language sql
stable
security definer
set search_path = ''
as $$
  select a.job_id, a.user_id, coalesce(pr.name, pr.username, '이름 없음'), a.career, a.phone, a.message, a.status, a.created_at,
         (select count(*)::integer from public.training_reflections r where r.user_id = a.user_id)
  from public.job_applications a
  join public.job_posts j on j.id = a.job_id
  left join public.profiles pr on pr.id = a.user_id
  where j.academy_id = p_academy and private.academy_role(p_academy) = 'owner'
  order by a.created_at desc;
$$;

/* ---------- 제휴 신청 (센터가 맺어 둔 제휴처에) ---------- */
create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  academy_name text,
  partner_id text not null check (char_length(partner_id) between 1 and 20),
  partner_name text not null check (char_length(partner_name) between 1 and 100),
  memo text check (char_length(memo) <= 1000),
  status text not null default 'new' check (status in ('new', 'contacted', 'connected', 'closed')),
  admin_memo text check (char_length(admin_memo) <= 1000),
  created_at timestamptz not null default now()
);
create index partner_applications_academy_idx on public.partner_applications (academy_id);
-- 같은 제휴를 진행 중인데 또 신청하지 않게
create unique index partner_applications_open_uniq on public.partner_applications (academy_id, partner_id) where status <> 'closed';
comment on table public.partner_applications is '제휴 신청 (원장 → 센터)';
create trigger partner_applications_academy_name before insert on public.partner_applications
  for each row execute function private.fill_academy_name();

alter table public.partner_applications enable row level security;
create policy "원장은 우리 신청을, 관리자는 전부 볼 수 있음" on public.partner_applications for select to authenticated
  using (private.academy_role(academy_id) = 'owner' or private.is_center_admin());
create policy "원장이 제휴를 신청" on public.partner_applications for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "관리자가 제휴 신청을 처리" on public.partner_applications for update to authenticated
  using (private.is_center_admin()) with check (private.is_center_admin());
create policy "원장은 확인 전 신청을 취소" on public.partner_applications for delete to authenticated
  using (private.academy_role(academy_id) = 'owner' and status = 'new');

revoke all on public.partner_applications from anon, authenticated;
grant select, delete on public.partner_applications to authenticated;
grant insert (academy_id, partner_id, partner_name, memo) on public.partner_applications to authenticated;
grant update (status, admin_memo) on public.partner_applications to authenticated;

/* ---------- 유학 홍보 (원장 → 우리 학원 학부모·학생) ---------- */
create table public.abroad_promos (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  program text not null check (program in ('방학 해외 영어캠프', '초·중·고 조기유학', '단기 어학연수', '해외 대학 진학', '유학 설명회', '기타')),
  title text not null check (char_length(title) between 1 and 100),
  body text check (char_length(body) <= 2000),
  event_date date,      -- 설명회 날짜 · 출발일 등
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index abroad_promos_academy_idx on public.abroad_promos (academy_id);
comment on table public.abroad_promos is '학원이 학부모에게 보내는 유학 프로그램 안내';

alter table public.abroad_promos enable row level security;
create policy "우리 학원 사람은 안내 중인 홍보를, 원장은 전부 볼 수 있음" on public.abroad_promos for select to authenticated
  using ((active and private.academy_role(academy_id) is not null) or private.academy_role(academy_id) = 'owner');
create policy "원장만 홍보를 올림" on public.abroad_promos for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 홍보를 고침" on public.abroad_promos for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 홍보를 삭제" on public.abroad_promos for delete to authenticated
  using (private.academy_role(academy_id) = 'owner');

revoke all on public.abroad_promos from anon, authenticated;
grant select, delete on public.abroad_promos to authenticated;
grant insert (academy_id, program, title, body, event_date, active) on public.abroad_promos to authenticated;
grant update (program, title, body, event_date, active) on public.abroad_promos to authenticated;

/* ---------- 유학 상담 신청 (학부모 → 원장 → 센터) ---------- */
create table public.abroad_requests (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  academy_name text,
  promo_id uuid references public.abroad_promos (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  program text not null check (char_length(program) between 1 and 50),
  parent_name text not null check (char_length(parent_name) between 1 and 50),
  phone text not null check (char_length(phone) between 5 and 30),
  student_name text check (char_length(student_name) <= 50),
  student_grade text check (char_length(student_grade) <= 20),
  memo text check (char_length(memo) <= 1000),
  status text not null default 'new' check (status in ('new', 'confirmed', 'forwarded', 'done')),
  owner_memo text check (char_length(owner_memo) <= 1000),
  admin_memo text check (char_length(admin_memo) <= 1000),
  created_at timestamptz not null default now()
);
create index abroad_requests_academy_idx on public.abroad_requests (academy_id);
create index abroad_requests_user_idx on public.abroad_requests (user_id);
create index abroad_requests_promo_idx on public.abroad_requests (promo_id);
comment on table public.abroad_requests is '유학 상담 신청 (학부모 → 원장 확인 → 센터 연결)';

create function private.abroad_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.promo_id is not null and (select academy_id from public.abroad_promos where id = new.promo_id) is distinct from new.academy_id then
    raise exception 'promo_mismatch';
  end if;
  new.academy_name := (select name from public.academies where id = new.academy_id);
  return new;
end;
$$;
revoke execute on function private.abroad_requests_before_insert() from public, anon, authenticated;
create trigger abroad_requests_before_insert before insert on public.abroad_requests
  for each row execute function private.abroad_requests_before_insert();

alter table public.abroad_requests enable row level security;
create policy "내 신청 · 원장은 우리 학원 · 관리자는 연결 요청된 신청을 볼 수 있음" on public.abroad_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.academy_role(academy_id) = 'owner'
         or (private.is_center_admin() and status in ('forwarded', 'done')));
create policy "우리 학원 학부모·학생(원장도 대신) 신청" on public.abroad_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and private.academy_role(academy_id) in ('parent', 'student', 'owner'));
create policy "원장이 확인하고 센터에 연결 요청" on public.abroad_requests for update to authenticated
  using (private.academy_role(academy_id) = 'owner' and status in ('new', 'confirmed', 'forwarded'))
  with check (private.academy_role(academy_id) = 'owner' and status in ('new', 'confirmed', 'forwarded'));
create policy "관리자가 연결 요청을 처리" on public.abroad_requests for update to authenticated
  using (private.is_center_admin() and status in ('forwarded', 'done'))
  with check (private.is_center_admin() and status in ('forwarded', 'done'));

revoke all on public.abroad_requests from anon, authenticated;
grant select on public.abroad_requests to authenticated;
grant insert (academy_id, promo_id, program, parent_name, phone, student_name, student_grade, memo) on public.abroad_requests to authenticated;
grant update (status, owner_memo, admin_memo) on public.abroad_requests to authenticated;

revoke execute on function public.list_job_applicants(uuid) from public, anon;
grant execute on function public.list_job_applicants(uuid) to authenticated;

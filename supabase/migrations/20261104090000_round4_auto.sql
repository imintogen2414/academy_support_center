-- 4라운드: 원생 들고 남 · 현장 결제 직접 입력 · 자료실 폴더 · 원천세 계산 · 자동 처리 · 관리자 회원 한 명 보기

/* ---------- 1) 원생 상태: 다니는 중 · 쉬는 중 · 그만둠 (+ 들어온 날 · 그만두는 날) ----------
   매달 · 매주 바뀌는 원생을 한 번에 정리해요. 그만둔 학생은 출결 · 청구에서 빠지고 명단엔 남아요(기록 보관). */
alter table public.students
  add column status text not null default 'active' check (status in ('active', 'paused', 'left')),
  add column joined_on date default (now() at time zone 'Asia/Seoul')::date,
  add column left_on date;
update public.students set joined_on = (created_at at time zone 'Asia/Seoul')::date;
grant insert (status, joined_on, left_on) on public.students to authenticated;
grant update (status, joined_on, left_on) on public.students to authenticated;

/* ---------- 2) 현장 결제: 명단에 없는 사람(웹을 안 쓰는 수강생)도 이름만 적어 받기 ---------- */
create or replace function private.invoices_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare s record;
begin
  if new.student_id is null then
    if coalesce(trim(new.student_name), '') = '' then raise exception 'student_required'; end if;
    new.student_name := left(trim(new.student_name), 50);
    new.class_name := nullif(left(trim(coalesce(new.class_name, '')), 50), '');
    return new;
  end if;
  select academy_id, name, class_name into s from public.students where id = new.student_id;
  if not found or s.academy_id <> new.academy_id then raise exception 'student_mismatch'; end if;
  new.student_name := s.name;
  new.class_name := s.class_name;
  return new;
end;
$$;
grant insert (student_name, class_name) on public.invoices to authenticated;
alter table public.invoices add column reminded_at timestamptz; -- 미납 안내를 저절로 보낸 때

/* ---------- 3) 자료실 폴더: 원장 · 강사 누구나 만들고 이름 바꾸고 지워요. 학부모 · 학생은 보기만 ---------- */
create table public.library_folders (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 50),
  sort int not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index library_folders_academy_idx on public.library_folders (academy_id, sort, name);
comment on table public.library_folders is '자료실 폴더 (원장 · 강사가 정리)';
alter table public.library_folders enable row level security;
create policy "학원 사람은 폴더를 봐요" on public.library_folders for select to authenticated
  using (private.academy_role(academy_id) is not null);
create policy "원장·강사가 폴더를 만들어요" on public.library_folders for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장·강사가 폴더를 고쳐요" on public.library_folders for update to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher'))
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장·강사가 폴더를 지워요" on public.library_folders for delete to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher'));
revoke all on public.library_folders from anon, authenticated;
grant select, delete on public.library_folders to authenticated;
grant insert (academy_id, name, sort) on public.library_folders to authenticated;
grant update (name, sort) on public.library_folders to authenticated;

alter table public.library_items add column folder_id uuid references public.library_folders (id) on delete set null;
create index library_items_folder_idx on public.library_items (folder_id);
grant insert (folder_id) on public.library_items to authenticated;
grant update (folder_id) on public.library_items to authenticated;

create or replace function private.fill_library_uploader()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.folder_id is not null and not exists (select 1 from public.library_folders f where f.id = new.folder_id and f.academy_id = new.academy_id) then
    raise exception 'bad_folder';
  end if;
  if tg_op = 'INSERT' then
    new.uploaded_by := (select auth.uid());
    new.uploader_role := private.academy_role(new.academy_id);
    select coalesce(p.name, p.username) into new.uploader_name from public.profiles p where p.id = new.uploaded_by;
    if new.file_path is not null and split_part(new.file_path, '/', 1) <> new.academy_id::text then raise exception 'bad_path'; end if;
  else
    new.file_path := old.file_path; new.file_name := old.file_name; new.file_size := old.file_size; new.mime := old.mime;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- 폴더 옮기기: 원장 · 강사는 볼 수 있는 자료라면 누가 올렸든 폴더만 옮길 수 있어요 (내용은 그대로)
create function public.move_library_items(p_items uuid[], p_folder uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  update public.library_items i set folder_id = p_folder, updated_at = now()
   where i.id = any (p_items)
     and private.academy_role(i.academy_id) in ('owner', 'teacher')
     and private.can_see_library(i.academy_id, i.visibility, i.target_class, i.uploaded_by)
     and (p_folder is null or exists (select 1 from public.library_folders f where f.id = p_folder and f.academy_id = i.academy_id));
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.move_library_items(uuid[], uuid) from public, anon;
grant execute on function public.move_library_items(uuid[], uuid) to authenticated;

/* ---------- 4) 원천세 계산: 강사마다 지급액을 넣으면 세금 · 실지급액을 화면이 계산해 남겨요 (원장만) ----------
   kind: freelance 사업소득 3.3% · daily 일용근로(15만원 공제 후 2.7%, 1천원 미만 소액부징수) · wage 근로소득(간이세액 직접) · other 직접 */
create table public.payroll (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  person_name text not null check (char_length(trim(person_name)) between 1 and 50),
  kind text not null default 'freelance' check (kind in ('freelance', 'daily', 'wage', 'other')),
  days int check (days between 0 and 31),
  gross bigint not null check (gross between 0 and 100000000000),
  income_tax bigint not null default 0 check (income_tax >= 0),
  local_tax bigint not null default 0 check (local_tax >= 0),
  paid_on date,
  memo text check (char_length(memo) <= 300),
  expense_id uuid references public.expenses (id) on delete set null,
  created_at timestamptz not null default now()
);
create index payroll_academy_month_idx on public.payroll (academy_id, month);
comment on table public.payroll is '강사 지급 · 원천세 (원장만)';
alter table public.payroll enable row level security;
create policy "원장만 지급을 봐요" on public.payroll for select to authenticated using (private.academy_role(academy_id) = 'owner');
create policy "원장만 지급을 넣어요" on public.payroll for insert to authenticated with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 지급을 고쳐요" on public.payroll for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 지급을 지워요" on public.payroll for delete to authenticated using (private.academy_role(academy_id) = 'owner');
revoke all on public.payroll from anon, authenticated;
grant select, insert, update, delete on public.payroll to authenticated;

/* ---------- 5) 자동 처리: 켜 두면 원장님이 안 들어와도 매일 아침(한국 9시 10분) 저절로 ----------
   academies.auto = { bill: {on, day}, unpaid: {on, days}, paper: {on} }
   bill   : 매달 day일에 "정해 둔 수강료"가 붙은 다니는 중 원생에게 이 달 수강료 청구서 (이미 있으면 건너뛰기)
   unpaid : 기한이 days일 지나도 납부 확인 · 입금 알림이 없으면 연결된 학부모(성인 학원은 수강생)에게 원장님 이름으로 채팅 안내 한 번
   paper  : 지난달 강사 지급이 있으면 이번 달 10일 원천세 신고 · 1월엔 2월 10일 사업장현황신고를 서류 목록에
   그 밖에 그만두는 날(left_on)이 지난 원생은 늘 "그만둠"으로 바꿔요. */
alter table public.academies add column auto jsonb not null default '{}'::jsonb;
grant update (auto) on public.academies to authenticated; -- 고치기는 원장만(정책 그대로)

create table public.auto_logs (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  kind text not null,
  key text not null,
  message text not null,
  created_at timestamptz not null default now(),
  unique (academy_id, key)
);
comment on table public.auto_logs is '자동 처리 기록 (원장만 보기)';
alter table public.auto_logs enable row level security;
create policy "원장만 자동 기록을 봐요" on public.auto_logs for select to authenticated using (private.academy_role(academy_id) = 'owner');
revoke all on public.auto_logs from anon, authenticated;
grant select on public.auto_logs to authenticated;

-- 원장 이름으로 한 사람에게 채팅 한 줄 (대화할 수 있는 사이일 때만)
create function private.auto_message(p_from uuid, p_to uuid, p_body text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare aid uuid; a uuid; b uuid; cid uuid;
begin
  aid := private.message_academy(p_from, p_to);
  if aid is null then return false; end if;
  a := least(p_from, p_to); b := greatest(p_from, p_to);
  insert into public.conversations (academy_id, user_a, user_b, created_by) values (aid, a, b, p_from) on conflict (user_a, user_b) do nothing;
  select id into cid from public.conversations where user_a = a and user_b = b;
  insert into public.conversation_members (conversation_id, user_id) values (cid, a), (cid, b) on conflict do nothing;
  insert into public.messages (conversation_id, sender_id, body) values (cid, p_from, left(p_body, 2000));
  return true;
end;
$$;
revoke execute on function private.auto_message(uuid, uuid, text) from public, anon, authenticated;

create function private.run_automations(p_academy uuid default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  ym text := to_char((now() at time zone 'Asia/Seoul')::date, 'YYYY-MM');
  last_ym text := to_char(((now() at time zone 'Asia/Seoul')::date - interval '1 month'), 'YYYY-MM');
  r record; i record; n int; total int := 0; v_owner uuid; v_day int; v_days int; v_due date; sent int; tax bigint; pay bigint;
begin
  -- 그만두는 날이 지난 원생은 그만둠으로
  update public.students set status = 'left'
   where status <> 'left' and left_on is not null and left_on <= today and (p_academy is null or academy_id = p_academy);

  for r in select a.id, a.name, a.auto, a.family from public.academies a
            where (p_academy is null or a.id = p_academy) and a.auto <> '{}'::jsonb loop
    select m.user_id into v_owner from public.academy_members m where m.academy_id = r.id and m.role = 'owner' order by m.created_at limit 1;

    -- 매달 청구서
    if coalesce((r.auto -> 'bill' ->> 'on')::boolean, false) then
      v_day := least(greatest(coalesce((r.auto -> 'bill' ->> 'day')::int, 1), 1), 28);
      if extract(day from today) >= v_day and not exists (select 1 from public.auto_logs l where l.academy_id = r.id and l.key = 'bill:' || ym) then
        v_due := least(make_date(extract(year from today)::int, extract(month from today)::int, v_day) + 7,
                       (date_trunc('month', today) + interval '1 month - 1 day')::date);
        insert into public.invoices (academy_id, student_id, month, title, amount, due, student_name)
          select r.id, s.id, ym, '수강료', p.amount, v_due, s.name
            from public.students s join public.tuition_plans p on p.id = s.tuition_plan_id
           where s.academy_id = r.id and s.status = 'active'
             and not exists (select 1 from public.invoices x where x.student_id = s.id and x.month = ym and x.title = '수강료');
        get diagnostics n = row_count;
        if n > 0 then
          insert into public.auto_logs (academy_id, kind, key, message)
            values (r.id, 'bill', 'bill:' || ym, to_char(today, 'FMMM') || '월 수강료 청구서 ' || n || '건을 정해 둔 금액으로 만들었어요');
          total := total + 1;
        end if;
      end if;
    end if;

    -- 미납 안내 (청구 하나에 한 번만)
    if coalesce((r.auto -> 'unpaid' ->> 'on')::boolean, false) and v_owner is not null then
      v_days := least(greatest(coalesce((r.auto -> 'unpaid' ->> 'days')::int, 3), 0), 60);
      sent := 0;
      for i in select iv.* from public.invoices iv
                where iv.academy_id = r.id and iv.paid_at is null and iv.reported_at is null and iv.reminded_at is null
                  and iv.student_id is not null and iv.due is not null and iv.due + v_days <= today loop
        n := 0;
        select count(*) into n from (
          select private.auto_message(v_owner, l.user_id,
            '[' || r.name || '] ' || i.student_name || ' ' || to_char(to_date(i.month, 'YYYY-MM'), 'FMMM') || '월 ' || i.title || ' '
            || to_char(i.amount, 'FM999,999,999') || '원이 아직 확인되지 않았어요 (기한 ' || to_char(i.due, 'FMMM/FMDD') || '). '
            || '이미 보내셨다면 앱 "수납"에서 "보냈어요"를 눌러 주세요. 감사합니다.') ok
            from public.student_links l join public.academy_members m on m.user_id = l.user_id and m.academy_id = r.id
           where l.student_id = i.student_id and m.role = case when r.family then 'parent' else 'student' end) x where x.ok;
        update public.invoices set reminded_at = now() where id = i.id;
        if n > 0 then sent := sent + 1; end if;
      end loop;
      if sent > 0 then
        insert into public.auto_logs (academy_id, kind, key, message)
          values (r.id, 'unpaid', 'unpaid:' || today || ':' || gen_random_uuid(), '기한이 지난 청구 ' || sent || '건에 미납 안내 채팅을 보냈어요');
        total := total + 1;
      end if;
    end if;

    -- 서류 마감 저절로 넣기
    if coalesce((r.auto -> 'paper' ->> 'on')::boolean, false) then
      select coalesce(sum(gross), 0), coalesce(sum(income_tax + local_tax), 0) into pay, tax from public.payroll where academy_id = r.id and month = last_ym;
      if pay > 0 then
        insert into public.paperwork (academy_id, title, org, due, memo, auto_key)
          values (r.id, to_char(to_date(last_ym, 'YYYY-MM'), 'FMMM') || '월분 원천세 신고·납부', '세무서', make_date(extract(year from today)::int, extract(month from today)::int, 10),
                  '지급 ' || to_char(pay, 'FM999,999,999') || '원 · 원천세 ' || to_char(tax, 'FM999,999,999') || '원 · 서류·행정 → 원천세 계산에서 엑셀로 받아 홈택스에 신고해요.', 'wht:' || last_ym)
          on conflict (academy_id, auto_key) where auto_key is not null do nothing;
        get diagnostics n = row_count;
        if n > 0 then
          insert into public.auto_logs (academy_id, kind, key, message) values (r.id, 'paper', 'paper:wht:' || last_ym, to_char(to_date(last_ym, 'YYYY-MM'), 'FMMM') || '월분 원천세 신고를 서류 목록에 넣었어요 (10일 마감)')
            on conflict do nothing;
          total := total + 1;
        end if;
      end if;
      if extract(month from today) = 1 then
        insert into public.paperwork (academy_id, title, org, due, memo, auto_key)
          values (r.id, (extract(year from today)::int - 1) || '년 사업장현황신고', '세무서', make_date(extract(year from today)::int, 2, 10),
                  '서류·행정에서 "사업장현황 수입 요약"을 받아 홈택스에서 신고해요.', 'biz:' || (extract(year from today)::int - 1))
          on conflict (academy_id, auto_key) where auto_key is not null do nothing;
        get diagnostics n = row_count;
        if n > 0 then
          insert into public.auto_logs (academy_id, kind, key, message) values (r.id, 'paper', 'paper:biz:' || extract(year from today)::int, '사업장현황신고를 서류 목록에 넣었어요 (2월 10일 마감)')
            on conflict do nothing;
          total := total + 1;
        end if;
      end if;
    end if;
  end loop;
  return total;
end;
$$;
revoke execute on function private.run_automations(uuid) from public, anon, authenticated;

-- 원장이 "지금 한 번 해 보기"
create function public.run_my_automations(p_academy uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.academy_role(p_academy) is distinct from 'owner' then raise exception 'owner_only'; end if;
  return private.run_automations(p_academy);
end;
$$;
revoke execute on function public.run_my_automations(uuid) from public, anon;
grant execute on function public.run_my_automations(uuid) to authenticated;

create extension if not exists pg_cron;
select cron.schedule('asc-automations', '10 0 * * *', 'select private.run_automations()');

/* ---------- 6) 관리자: 회원 한 명 자세히 (학원 · 역할 · 이용 분야 · 연결된 아이 · 최근 연 메뉴 · 쓴 기록 수) ---------- */
create function public.admin_member_detail(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not private.is_center_admin() then null else jsonb_build_object(
    'academies', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'name', a.name, 'region', a.region, 'role', m.role, 'family', a.family, 'joined_at', m.created_at, 'classes', m.classes,
        'services', (select coalesce(jsonb_object_agg(s.area, s.status), '{}'::jsonb) from public.academy_services s where s.academy_id = a.id),
        'students', (select count(*) from public.students st where st.academy_id = a.id and st.status <> 'left'),
        'teachers', (select count(*) from public.academy_members t where t.academy_id = a.id and t.role = 'teacher'),
        'auto', a.auto) order by m.created_at)
      from public.academy_members m join public.academies a on a.id = m.academy_id where m.user_id = p_user), '[]'::jsonb),
    'kids', coalesce((select jsonb_agg(jsonb_build_object('name', st.name, 'class', st.class_name, 'academy', a.name))
      from public.student_links l join public.students st on st.id = l.student_id join public.academies a on a.id = l.academy_id where l.user_id = p_user), '[]'::jsonb),
    'partner', (select partner from public.partner_members where user_id = p_user),
    'seen', coalesce((select jsonb_agg(jsonb_build_object('key', x.key, 'at', x.seen_at) order by x.seen_at desc)
      from (select key, seen_at from public.user_seen where user_id = p_user order by seen_at desc limit 12) x), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('no', upper(left(replace(r.id::text, '-', ''), 8)), 'needs', r.needs, 'status', r.status, 'created_at', r.created_at) order by r.created_at desc)
      from public.support_requests r where r.academy_id in (select academy_id from public.academy_members where user_id = p_user and role = 'owner')), '[]'::jsonb),
    'counts', jsonb_build_object(
      'messages30', (select count(*) from public.messages where sender_id = p_user and created_at > now() - interval '30 days'),
      'reflections', (select count(*) from public.training_reflections where user_id = p_user),
      'inquiries', (select count(*) from public.inquiries where user_id = p_user),
      'tasks', (select count(*) from public.center_tasks where requested_by = p_user),
      'promo', (select count(*) from public.promo_requests where requested_by = p_user),
      'partner_apps', (select count(*) from public.partner_applications where requested_by = p_user),
      'library', (select count(*) from public.library_items where uploaded_by = p_user),
      'todos30', (select count(*) from public.student_todos where created_by = p_user and created_at > now() - interval '30 days'))
  ) end;
$$;
revoke execute on function public.admin_member_detail(uuid) from public, anon;
grant execute on function public.admin_member_detail(uuid) to authenticated;

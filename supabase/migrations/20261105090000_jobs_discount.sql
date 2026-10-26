-- 5라운드: 사람인처럼 자세한 채용 공고 · 학원 소개 · 강사 이력서 · 공개 채용 게시판 · 수강료 할인(원가 / 실제 받은 금액)

/* ---------- 채용 공고: 모집 요강을 자세히 ---------- */
alter table public.job_posts
  add column career_level text not null default '무관' check (career_level in ('무관', '신입', '경력')),
  add column career_years int check (career_years between 0 and 40),
  add column education text check (char_length(education) <= 30),
  add column headcount int check (headcount between 1 and 99),
  add column work_days text check (char_length(work_days) <= 50),
  add column requirements text check (char_length(requirements) <= 1000),
  add column preferred text check (char_length(preferred) <= 1000),
  add column benefits text[] not null default '{}' check (cardinality(benefits) <= 20),
  add column process text check (char_length(process) <= 200);
grant insert (career_level, career_years, education, headcount, work_days, requirements, preferred, benefits, process) on public.job_posts to authenticated;
grant update (career_level, career_years, education, headcount, work_days, requirements, preferred, benefits, process) on public.job_posts to authenticated;

/* ---------- 학원 소개 (채용 게시판 · 공개 강사 채용 페이지에 보여요) ---------- */
alter table public.academies
  add column intro text check (char_length(intro) <= 1000),
  add column field text check (char_length(field) <= 30),
  add column homepage text check (homepage is null or (char_length(homepage) <= 200 and homepage ~ '^https://')),
  add column listed boolean not null default false;
comment on column public.academies.listed is '공고가 없어도 공개 강사 채용 페이지 "가입한 학원"에 보이기';
grant update (intro, field, homepage, listed) on public.academies to authenticated;

/* ---------- 강사 이력서 (지원할 때 원장님께 함께 가요) ---------- */
create table public.teacher_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  headline text check (char_length(headline) <= 100),
  career_years int check (career_years between 0 and 40),
  subjects text check (char_length(subjects) <= 100),
  regions text check (char_length(regions) <= 100),
  education text check (char_length(education) <= 100),
  certs text check (char_length(certs) <= 300),
  available text check (char_length(available) <= 100),
  intro text check (char_length(intro) <= 2000),
  open_to_offers boolean not null default false,
  updated_at timestamptz not null default now()
);
comment on table public.teacher_profiles is '강사 이력서 · 센터 강사풀 (open_to_offers면 센터가 강사 구하기에 연결)';
alter table public.teacher_profiles enable row level security;
create policy "내 이력서 · 센터는 강사풀만" on public.teacher_profiles for select to authenticated
  using (user_id = (select auth.uid()) or (open_to_offers and private.is_center_admin()));
create policy "강사가 이력서를 씀" on public.teacher_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and private.my_role() = 'teacher');
create policy "강사가 이력서를 고침" on public.teacher_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "강사가 이력서를 지움" on public.teacher_profiles for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.teacher_profiles from anon, authenticated;
grant select, delete on public.teacher_profiles to authenticated;
grant insert (headline, career_years, subjects, regions, education, certs, available, intro, open_to_offers) on public.teacher_profiles to authenticated;
grant update (headline, career_years, subjects, regions, education, certs, available, intro, open_to_offers, updated_at) on public.teacher_profiles to authenticated;

-- 원장: 지원자 목록에 이력서를 함께
drop function public.list_job_applicants(uuid);
create function public.list_job_applicants(p_academy uuid)
returns table (job_id uuid, user_id uuid, name text, career text, phone text, message text, status text, applied_at timestamptz, trainings_done integer, profile jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select a.job_id, a.user_id, coalesce(pr.name, pr.username, '이름 없음'), a.career, a.phone, a.message, a.status, a.created_at,
         (select count(*)::integer from public.training_reflections r where r.user_id = a.user_id),
         (select to_jsonb(t) - 'user_id' - 'open_to_offers' from public.teacher_profiles t where t.user_id = a.user_id)
  from public.job_applications a
  join public.job_posts j on j.id = a.job_id
  left join public.profiles pr on pr.id = a.user_id
  where j.academy_id = p_academy and private.academy_role(p_academy) = 'owner'
  order by a.created_at desc;
$$;
revoke execute on function public.list_job_applicants(uuid) from public, anon;
grant execute on function public.list_job_applicants(uuid) to authenticated;

-- 센터 관리자: 강사풀 (제안 받기를 켠 강사)
create function public.admin_teacher_pool()
returns table (user_id uuid, name text, phone text, headline text, career_years int, subjects text, regions text, available text, intro text, trainings_done int, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select t.user_id, coalesce(p.name, p.username), p.phone, t.headline, t.career_years, t.subjects, t.regions, t.available, t.intro,
         (select count(*)::int from public.training_reflections r where r.user_id = t.user_id), t.updated_at
  from public.teacher_profiles t left join public.profiles p on p.id = t.user_id
  where t.open_to_offers and private.is_center_admin()
  order by t.updated_at desc;
$$;
revoke execute on function public.admin_teacher_pool() from public, anon;
grant execute on function public.admin_teacher_pool() to authenticated;

/* ---------- 공개 채용 게시판: 가입 안 해도 공고 · 학원 소개를 봐요 (개인 정보는 없어요) ---------- */
create function public.public_job_board()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with posts as (
    select j.id, j.academy_id, coalesce(a.name, j.academy_name) academy_name, j.title, j.job_type, j.subject, j.pay, j.hours, coalesce(j.area, a.region) area,
           j.description, j.due, j.academy_field, j.career_level, j.career_years, j.education, j.headcount, j.work_days,
           j.requirements, j.preferred, j.benefits, j.process, j.created_at
    from public.job_posts j join public.academies a on a.id = j.academy_id
    where j.status = 'open' and (j.due is null or j.due >= (now() at time zone 'Asia/Seoul')::date)
  )
  select jsonb_build_object(
    'posts', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from posts p), '[]'::jsonb),
    'academies', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'region', a.region, 'field', a.field, 'intro', a.intro, 'homepage', a.homepage,
                                  'open_jobs', (select count(*) from posts p where p.academy_id = a.id)) order by a.name)
                           from public.academies a where a.listed or exists (select 1 from posts p where p.academy_id = a.id)), '[]'::jsonb));
$$;
revoke execute on function public.public_job_board() from public;
grant execute on function public.public_job_board() to anon, authenticated;

/* ---------- 수강료 할인: 원가(list_amount) · 실제 받을 금액(amount) · 할인 내역(discount_note) ---------- */
create table public.discount_presets (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  kind text not null default 'won' check (kind in ('won', 'pct')),
  value int not null check (value > 0 and (kind = 'won' or value <= 100)),
  created_at timestamptz not null default now()
);
create index discount_presets_academy_idx on public.discount_presets (academy_id);
comment on table public.discount_presets is '자주 쓰는 할인 (형제 할인 10% · 장기 등록 2만 원 …), 원장만';
alter table public.discount_presets enable row level security;
create policy "원장만 할인을 봄" on public.discount_presets for select to authenticated using (private.academy_role(academy_id) = 'owner');
create policy "원장만 할인을 만듦" on public.discount_presets for insert to authenticated with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 할인을 고침" on public.discount_presets for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 할인을 지움" on public.discount_presets for delete to authenticated using (private.academy_role(academy_id) = 'owner');
revoke all on public.discount_presets from anon, authenticated;
grant select, delete on public.discount_presets to authenticated;
grant insert (academy_id, name, kind, value) on public.discount_presets to authenticated;
grant update (name, kind, value) on public.discount_presets to authenticated;

alter table public.invoices
  add column list_amount int check (list_amount >= 0),
  add column discount_note text check (char_length(discount_note) <= 100),
  add constraint invoices_list_ge_amount check (list_amount is null or list_amount >= amount);
comment on column public.invoices.list_amount is '할인 전 원가 (없으면 amount와 같아요)';
grant insert (list_amount, discount_note) on public.invoices to authenticated;
grant update (list_amount, discount_note) on public.invoices to authenticated;

-- 원생마다 늘 받는 할인 → 청구서를 만들 때 저절로
alter table public.students add column discount_id uuid references public.discount_presets (id) on delete set null;
grant insert (discount_id) on public.students to authenticated;
grant update (discount_id) on public.students to authenticated;

-- 할인 적용한 금액
create function private.apply_discount(p_amount int, p_kind text, p_value int)
returns int language sql immutable set search_path = '' as $$
  select case when p_kind is null then p_amount
              when p_kind = 'pct' then greatest(p_amount - round(p_amount * p_value / 100.0 / 10) * 10, 0)::int
              else greatest(p_amount - p_value, 0) end;
$$;

-- 학부모 수납 화면: 원가 · 할인 내역도
drop function public.my_child_invoices();
create function public.my_child_invoices()
returns table (id uuid, student_id uuid, student_name text, month text, title text, amount integer, due date, paid_at date, method text, reported_at timestamptz, list_amount integer, discount_note text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.student_id, i.student_name, i.month, i.title, i.amount, i.due, i.paid_at, i.method, i.reported_at, i.list_amount, i.discount_note
  from public.invoices i
  join public.student_links l on l.student_id = i.student_id and l.user_id = (select auth.uid())
  where private.academy_role(i.academy_id) = 'parent'
  order by i.month desc, i.created_at;
$$;
revoke execute on function public.my_child_invoices() from public, anon;
grant execute on function public.my_child_invoices() to authenticated;

-- 매달 청구서 자동: 원생의 늘 받는 할인을 반영
create or replace function private.run_automations(p_academy uuid default null)
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
        insert into public.invoices (academy_id, student_id, month, title, amount, due, student_name, list_amount, discount_note)
          select r.id, s.id, ym, '수강료', private.apply_discount(p.amount, dp.kind, dp.value), v_due, s.name,
                 case when dp.id is not null then p.amount end, dp.name
            from public.students s join public.tuition_plans p on p.id = s.tuition_plan_id
            left join public.discount_presets dp on dp.id = s.discount_id
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


-- 첫 화면 새 이름(유학·캠프 제휴 · 홍보 대행 · 강사 구하기)도 분야로 알아듣게
create or replace function private.area_id(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name like '행정%' then 'admin' when p_name like '강사%' then 'teachers'
    when p_name like '학생%' then 'members' when p_name like '제휴%' or p_name like '유학%' then 'mou'
    when p_name like '홍보%' then 'promo' end;
$$;

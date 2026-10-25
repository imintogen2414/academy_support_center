-- 2단계 테이블: 학원 · 학원 소속(누가 어느 학원 사람인지) · 초대 코드 · 원생
-- 원칙: 각자 "자기 학원" 데이터만 본다. 역할은 스스로 고른 게 아니라 "어떤 초대 코드로 들어왔는지"로 정한다.

/* ---------- 정책에서 쓰는 도우미 (API에 노출되지 않는 private 스키마) ---------- */
create schema if not exists private;
grant usage on schema private to authenticated;

/* ---------- 학원 ---------- */
create table public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  region text check (char_length(region) <= 100),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
comment on table public.academies is '학원';

/* ---------- 학원 소속: 한 학원에 원장 여러 명, 강사·학부모·학생 ---------- */
create table public.academy_members (
  academy_id uuid not null references public.academies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'teacher', 'parent', 'student')),
  created_at timestamptz not null default now(),
  primary key (academy_id, user_id)
);
create index academy_members_user_idx on public.academy_members (user_id);
comment on table public.academy_members is '누가 어느 학원에 어떤 역할로 속해 있는지';

/* ---------- 초대 코드: 원장용 · 강사용 · 학부모·학생용 (원장만 볼 수 있음) ---------- */
create table public.academy_codes (
  academy_id uuid not null references public.academies (id) on delete cascade,
  kind text not null check (kind in ('owner', 'teacher', 'family')),
  code text not null unique,
  created_at timestamptz not null default now(),
  primary key (academy_id, kind)
);
comment on table public.academy_codes is '학원 초대 코드 (직접 읽기 막힘, get_invite_codes로 원장만 조회)';

/* ---------- 원생 ---------- */
create table public.students (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  grade text check (char_length(grade) <= 20),
  class_name text check (char_length(class_name) <= 50),
  parent_name text check (char_length(parent_name) <= 50),
  parent_phone text check (char_length(parent_phone) <= 30),
  memo text check (char_length(memo) <= 500),
  created_at timestamptz not null default now()
);
create index students_academy_idx on public.students (academy_id);
comment on table public.students is '원생 명단';

/* ---------- 내가 이 학원에서 무슨 역할인지 (정책용) ---------- */
create function private.academy_role(aid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.academy_members
  where academy_id = aid and user_id = (select auth.uid());
$$;
revoke execute on function private.academy_role(uuid) from public, anon;
grant execute on function private.academy_role(uuid) to authenticated;

/* ---------- 접근 규칙 (RLS) ---------- */
alter table public.academies enable row level security;
alter table public.academy_members enable row level security;
alter table public.academy_codes enable row level security;
alter table public.students enable row level security;

create policy "소속 학원만 볼 수 있음" on public.academies for select to authenticated
  using (private.academy_role(id) is not null);
create policy "원장만 학원 정보를 고칠 수 있음" on public.academies for update to authenticated
  using (private.academy_role(id) = 'owner') with check (private.academy_role(id) = 'owner');

create policy "내 소속만 볼 수 있음" on public.academy_members for select to authenticated
  using (user_id = (select auth.uid()));

-- academy_codes: 정책 없음 = 직접 읽기·쓰기 모두 막힘

create policy "원장·강사는 원생을 볼 수 있음" on public.students for select to authenticated
  using (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장만 원생을 추가" on public.students for insert to authenticated
  with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 원생을 고침" on public.students for update to authenticated
  using (private.academy_role(academy_id) = 'owner') with check (private.academy_role(academy_id) = 'owner');
create policy "원장만 원생을 삭제" on public.students for delete to authenticated
  using (private.academy_role(academy_id) = 'owner');

revoke all on public.academies, public.academy_members, public.academy_codes, public.students from anon, authenticated;
grant select on public.academies to authenticated;
grant update (name, region) on public.academies to authenticated;
grant select on public.academy_members to authenticated;
grant select, delete on public.students to authenticated;
grant insert (academy_id, name, grade, class_name, parent_name, parent_phone, memo) on public.students to authenticated;
grant update (name, grade, class_name, parent_name, parent_phone, memo) on public.students to authenticated;

/* ---------- 초대 코드 만들기 (헷갈리는 글자 0·O·1·I 빼고 8자) ---------- */
create function private.new_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  out text := '';
begin
  for i in 0..7 loop
    out := out || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return out;
end;
$$;
revoke execute on function private.new_code() from public, anon, authenticated;

/* ---------- 원장: 학원 만들기 (만든 사람은 원장, 초대 코드 3개 생성) ---------- */
create function public.create_academy(p_name text, p_region text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  aid uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if (select role from public.profiles where id = uid) is distinct from 'owner' then
    raise exception 'owner_only';
  end if;
  insert into public.academies (name, region, created_by)
    values (left(trim(p_name), 100), nullif(left(trim(coalesce(p_region, '')), 100), ''), uid)
    returning id into aid;
  insert into public.academy_members (academy_id, user_id, role) values (aid, uid, 'owner');
  insert into public.academy_codes (academy_id, kind, code) values
    (aid, 'owner', private.new_code()),
    (aid, 'teacher', private.new_code()),
    (aid, 'family', private.new_code());
  return aid;
end;
$$;

/* ---------- 초대 코드로 학원 합류 (코드 종류가 역할을 정함) ---------- */
create function public.join_academy(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  my_role text;
  c record;
  new_role text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select role into my_role from public.profiles where id = uid;
  select academy_id, kind into c from public.academy_codes where code = upper(trim(p_code));
  if not found then raise exception 'invalid_code'; end if;

  new_role := case
    when c.kind = 'owner' and my_role = 'owner' then 'owner'
    when c.kind = 'teacher' and my_role = 'teacher' then 'teacher'
    when c.kind = 'family' and my_role in ('parent', 'student') then my_role
  end;
  if new_role is null then raise exception 'role_mismatch:%', c.kind; end if;

  insert into public.academy_members (academy_id, user_id, role)
    values (c.academy_id, uid, new_role)
    on conflict (academy_id, user_id) do nothing;
  return c.academy_id;
end;
$$;

/* ---------- 원장: 초대 코드 보기 ---------- */
create function public.get_invite_codes(p_academy uuid)
returns table (kind text, code text)
language sql
stable
security definer
set search_path = ''
as $$
  select kind, code from public.academy_codes
  where academy_id = p_academy and private.academy_role(p_academy) = 'owner'
  order by array_position(array['owner', 'teacher', 'family'], kind);
$$;

/* ---------- 원장: 우리 학원 사람들 보기 ---------- */
create function public.list_academy_members(p_academy uuid)
returns table (name text, role text, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.name, p.username, '이름 없음'), m.role, m.created_at
  from public.academy_members m
  left join public.profiles p on p.id = m.user_id
  where m.academy_id = p_academy and private.academy_role(p_academy) = 'owner'
  order by array_position(array['owner', 'teacher', 'parent', 'student'], m.role), m.created_at;
$$;

revoke execute on function public.create_academy(text, text), public.join_academy(text),
  public.get_invite_codes(uuid), public.list_academy_members(uuid) from public, anon;
grant execute on function public.create_academy(text, text), public.join_academy(text),
  public.get_invite_codes(uuid), public.list_academy_members(uuid) to authenticated;

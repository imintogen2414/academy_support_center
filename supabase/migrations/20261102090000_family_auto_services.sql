-- 성인 학원: 학부모 기능 켜고 끄기 · 신청한 분야만 저절로 열기
-- 1) academies.family: 학부모와 함께 쓰는 학원(true, 어린이 · 청소년)인지, 수강생 본인만 쓰는 학원(false, 성인 · 토익 · 자격증)인지
alter table public.academies add column family boolean not null default true;
grant update (family) on public.academies to authenticated; -- 고치기는 원장만(정책 그대로)

-- 2) 분야 열기: 신청한 분야를 "이용 중"으로 (이미 이용 중이면 그대로)
create function private.open_services(p_academy uuid, p_areas text[])
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.academy_services (academy_id, area, status)
    select p_academy, a, 'active' from unnest(p_areas) a where a in ('admin', 'teachers', 'members', 'mou', 'promo')
  on conflict (academy_id, area) do update set status = 'active', started_at = coalesce(public.academy_services.started_at, now()), updated_at = now()
    where public.academy_services.status <> 'active';
$$;
revoke execute on function private.open_services(uuid, text[]) from public, anon, authenticated;

-- 3) 학원 만들기: 학부모 기능 여부를 함께 받고, 같은 휴대폰으로 첫 화면에서 지원 신청한 게 있으면 저절로 이어서 그 분야만 열어요
drop function public.create_academy(text, text);
create function public.create_academy(p_name text, p_region text default null, p_family boolean default true)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  aid uuid;
  v_phone text;
  v_areas text[];
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if (select role from public.profiles where id = uid) is distinct from 'owner' then
    raise exception 'owner_only';
  end if;
  insert into public.academies (name, region, created_by, family)
    values (left(trim(p_name), 100), nullif(left(trim(coalesce(p_region, '')), 100), ''), uid, coalesce(p_family, true))
    returning id into aid;
  insert into public.academy_members (academy_id, user_id, role) values (aid, uid, 'owner');
  insert into public.academy_codes (academy_id, kind, code) values
    (aid, 'owner', private.new_code()),
    (aid, 'teacher', private.new_code()),
    (aid, 'family', private.new_code());
  select phone into v_phone from public.profiles where id = uid;
  if v_phone is not null then
    with linked as (
      update public.support_requests set academy_id = aid
       where academy_id is null and created_at > now() - interval '180 days'
         and regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = v_phone
      returning needs
    )
    select array_agg(distinct private.area_id(n)) filter (where private.area_id(n) is not null) into v_areas
      from linked, unnest(linked.needs) n;
    perform private.open_services(aid, coalesce(v_areas, '{}'));
  end if;
  return aid;
end;
$$;
revoke execute on function public.create_academy(text, text, boolean) from public, anon;
grant execute on function public.create_academy(text, text, boolean) to authenticated;

-- 4) 접수 번호로 잇기도 그 분야를 바로 열어요 (상담 중 대신 이용 중)
create or replace function public.claim_support_request(p_academy uuid, p_no text)
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
  perform private.open_services(p_academy, coalesce(v_areas, '{}'));
  return coalesce(v_areas, '{}');
end;
$$;

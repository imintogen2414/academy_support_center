-- 사진으로 올리기 사용 기록: 학원마다 한 달 10장까지 (센터 관리자는 제한 없음)
create table if not exists public.photo_reads (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  kind text not null check (kind in ('timetable', 'tuition')),
  created_at timestamptz not null default now()
);
create index if not exists photo_reads_academy_month on public.photo_reads (academy_id, created_at);
alter table public.photo_reads enable row level security;
-- 원장은 우리 학원 기록만 보기, 쓰기는 아래 함수로만
create policy "원장은 우리 학원 사진 기록 보기" on public.photo_reads for select
  using (private.academy_role(academy_id) = 'owner' or private.is_center_admin());

create or replace function private.photo_month_used(p_academy uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.photo_reads
  where academy_id = p_academy and created_at >= date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
$$;

-- 이번 달 남은 장수 (센터 관리자는 null = 제한 없음)
create or replace function public.photo_read_left(p_academy uuid) returns int
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.is_center_admin() then return null; end if;
  if private.academy_role(p_academy) is distinct from 'owner' then raise exception 'owner_only'; end if;
  return greatest(0, 10 - private.photo_month_used(p_academy));
end $$;

-- 한 장 쓰기 시작: 남은 장수가 없으면 photo_limit. 읽기에 실패하면 cancel_photo_read로 되돌려요
create or replace function public.start_photo_read(p_academy uuid, p_kind text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_admin boolean := private.is_center_admin();
begin
  if not v_admin and private.academy_role(p_academy) is distinct from 'owner' then raise exception 'owner_only'; end if;
  perform pg_advisory_xact_lock(hashtext('photo:' || p_academy::text));
  if not v_admin and private.photo_month_used(p_academy) >= 10 then raise exception 'photo_limit'; end if;
  insert into public.photo_reads (academy_id, user_id, kind) values (p_academy, auth.uid(), p_kind) returning id into v_id;
  return v_id;
end $$;

create or replace function public.cancel_photo_read(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.photo_reads where id = p_id and user_id = auth.uid() and created_at > now() - interval '10 minutes';
$$;

revoke all on function public.photo_read_left(uuid), public.start_photo_read(uuid, text), public.cancel_photo_read(uuid) from public, anon;
grant execute on function public.photo_read_left(uuid), public.start_photo_read(uuid, text), public.cancel_photo_read(uuid) to authenticated;

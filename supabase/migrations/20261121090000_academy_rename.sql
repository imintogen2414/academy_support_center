-- 학원 이름 · 지역 고치기 (그 학원 원장만)
-- 권한: academies 표는 이미 "원장만 학원 정보를 고칠 수 있음" 정책 + name · region 칸 update 권한이 있어요.
-- 여기서는 화면이 쓰는 RPC(이유 있는 오류)와, 이름을 바꾸면 진행 중인 신청 · 공고에 적힌 학원 이름도 함께 바뀌게 해요.
-- (첫 화면 지원 신청 · 문의는 그때 적은 기록이라 그대로 둬요.)

-- 이름은 앞뒤 빈칸을 빼고, 비면 안 돼요(직접 update해도)
create or replace function private.academy_name_check()
returns trigger language plpgsql set search_path to '' as $$
begin
  new.name := left(trim(coalesce(new.name, '')), 100);
  if new.name = '' then raise exception 'name_required'; end if;
  new.region := nullif(left(trim(coalesce(new.region, '')), 100), '');
  return new;
end $$;
drop trigger if exists academies_name_check on public.academies;
create trigger academies_name_check before insert or update of name, region on public.academies
  for each row execute function private.academy_name_check();

-- 이름이 바뀌면 학원 이름을 따로 적어 둔 표도 새 이름으로
create or replace function private.academy_name_sync()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.name is distinct from old.name then
    update public.job_posts set academy_name = new.name where academy_id = new.id;
    update public.partner_applications set academy_name = new.name where academy_id = new.id;
    update public.promo_requests set academy_name = new.name where academy_id = new.id;
    update public.abroad_requests set academy_name = new.name where academy_id = new.id;
    update public.center_tasks set academy_name = new.name where academy_id = new.id;
  end if;
  return null;
end $$;
revoke execute on function private.academy_name_sync() from public, anon, authenticated;
drop trigger if exists academies_name_sync on public.academies;
create trigger academies_name_sync after update of name on public.academies
  for each row execute function private.academy_name_sync();

-- 화면용: 원장인지 확인하고 이름 · 지역을 바꿔요
create or replace function public.rename_academy(p_academy uuid, p_name text, p_region text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  if private.academy_role(p_academy) is distinct from 'owner' then raise exception 'owner_only'; end if;
  if nullif(trim(coalesce(p_name, '')), '') is null then raise exception 'name_required'; end if;
  update public.academies set name = p_name, region = coalesce(nullif(trim(coalesce(p_region, '')), ''), region)
   where id = p_academy;
end $$;
revoke all on function public.rename_academy(uuid, text, text) from public, anon;
grant execute on function public.rename_academy(uuid, text, text) to authenticated;

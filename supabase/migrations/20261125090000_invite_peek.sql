-- 초대 코드 쉽게: 코드를 넣으면(또는 초대 링크 /join/코드를 열면) 가입 전에도 어느 학원 · 어떤 역할 코드인지 먼저 보여 줘요.
-- 코드를 아는 사람만 학원 이름 · 지역을 알 수 있어요 (원생 · 사람 정보는 없어요). 이용이 멈춘 학원은 안 보여요.
create or replace function public.peek_invite_code(p_code text)
returns table(academy_name text, region text, kind text, family boolean)
language sql stable security definer set search_path = ''
as $$
  select a.name, a.region, c.kind, coalesce(a.family, true)
  from public.academy_codes c join public.academies a on a.id = c.academy_id
  where c.code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
    and a.suspended_at is null
  limit 1;
$$;
revoke all on function public.peek_invite_code(text) from public;
grant execute on function public.peek_invite_code(text) to anon, authenticated;

-- 넣을 때 띄어쓰기 · 하이픈이 섞여도 들어가요 (K7P2-QX9M, k7p2 qx9m)
create or replace function public.join_academy(p_code text, p_as text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  my_role text;
  c record;
  new_role text;
  had text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select role into my_role from public.profiles where id = uid;
  select academy_id, kind into c from public.academy_codes where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found then raise exception 'invalid_code'; end if;
  new_role := case
    when c.kind = 'owner' then 'owner'
    when c.kind = 'teacher' then 'teacher'
    when c.kind = 'family' and p_as in ('parent', 'student') then p_as
    when c.kind = 'family' and my_role in ('parent', 'student') then my_role
  end;
  if new_role is null then raise exception 'pick_family_role'; end if;
  select role into had from public.academy_members where academy_id = c.academy_id and user_id = uid;
  if had is not null and had <> new_role then raise exception 'already_member:%', had; end if;
  if had is null then
    insert into public.academy_members (academy_id, user_id, role) values (c.academy_id, uid, new_role);
  end if;
  update public.profiles set role = new_role where id = uid and role is null;
  return c.academy_id;
end;
$$;

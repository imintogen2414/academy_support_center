-- 10단계: 채용 공고 학원 분야 · 리플렉션 비공개 · 강사도 홍보 의뢰

/* ---------- 채용 공고: 학원 분야 (영어 · 수학 · 코딩 …) ---------- */
alter table public.job_posts add column academy_field text check (char_length(academy_field) <= 30);
grant insert (academy_field) on public.job_posts to authenticated;
grant update (academy_field) on public.job_posts to authenticated;

/* ---------- 리플렉션: 쓴 사람 본인만 직접 읽어요 ----------
   원장은 academy_training_report(학원)로 우리 강사 것을 봐요. 관리자는 누가 이수했는지만 봐요(내용은 못 봐요). */
drop policy "내 리플렉션과, 관리자는 전부 볼 수 있음" on public.training_reflections;
create policy "내 리플렉션만 볼 수 있음" on public.training_reflections for select to authenticated
  using (user_id = (select auth.uid()));

-- 관리자: 영상마다 이수한 사람 수
create function public.admin_training_progress()
returns table (video_id uuid, done bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.video_id, count(*) from public.training_reflections r
  where private.is_center_admin() group by r.video_id;
$$;

-- 관리자: 영상 하나를 이수한 사람 (이름 · 학원 · 날짜만, 내용은 빼요)
drop function public.admin_video_reflections(uuid);
create function public.admin_video_reflections(p_video uuid)
returns table (name text, academies text, done_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.name, p.username, '이름 없음'),
         (select string_agg(a.name, ', ' order by a.name) from public.academy_members m
            join public.academies a on a.id = m.academy_id where m.user_id = r.user_id),
         r.created_at
  from public.training_reflections r
  left join public.profiles p on p.id = r.user_id
  where r.video_id = p_video and private.is_center_admin()
  order by r.created_at desc;
$$;

revoke execute on function public.admin_training_progress(), public.admin_video_reflections(uuid) from public, anon;
grant execute on function public.admin_training_progress(), public.admin_video_reflections(uuid) to authenticated;

/* ---------- 홍보 의뢰: 강사도 의뢰, 원장은 우리 학원 의뢰를 모두 봐요 ---------- */
alter table public.promo_requests
  add column requested_by uuid references auth.users (id) on delete set null,
  add column requester_name text,
  add column requester_role text check (requester_role in ('owner', 'teacher'));

-- 누가 의뢰했는지는 직접 못 넣고, 넣을 때 저절로 채워요
create function private.fill_promo_requester()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.requested_by := (select auth.uid());
  new.requester_role := private.academy_role(new.academy_id);
  select coalesce(p.name, p.username) into new.requester_name from public.profiles p where p.id = new.requested_by;
  return new;
end;
$$;
create trigger promo_requests_requester before insert on public.promo_requests
  for each row execute function private.fill_promo_requester();

drop policy "원장은 우리 의뢰를, 관리자는 전부 볼 수 있음" on public.promo_requests;
drop policy "원장이 홍보를 의뢰" on public.promo_requests;
drop policy "원장은 접수 단계 의뢰를 취소" on public.promo_requests;
create policy "원장은 우리 학원 의뢰를, 강사는 내 의뢰를, 관리자는 전부 볼 수 있음" on public.promo_requests for select to authenticated
  using (private.academy_role(academy_id) = 'owner' or requested_by = (select auth.uid()) or private.is_center_admin());
create policy "원장·강사가 홍보를 의뢰" on public.promo_requests for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "원장 또는 의뢰한 사람이 접수 단계 의뢰를 취소" on public.promo_requests for delete to authenticated
  using ((private.academy_role(academy_id) = 'owner' or requested_by = (select auth.uid())) and status = 'new');
revoke execute on function private.fill_promo_requester() from public, anon, authenticated;

-- 15단계: 자료실 — 학원 자료를 올리고, 누구에게 보일지 골라요. 원장은 모든 자료를 봐요(강사의 비공개 포함).
-- 파일은 Storage 'library' 버킷(비공개)에 "학원 id/자료 id/파일 이름"으로, 링크만 걸 수도 있어요.
--   private  : 나만 (원장은 볼 수 있어요)
--   staff    : 원장 · 강사
--   class    : 원장 · 강사 + 그 반 아이와 연결된 학부모 · 학생
--   everyone : 학원 사람 모두
create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 1000),
  category text not null default '수업 자료' check (category in ('수업 자료', '교재 · 문제', '학부모 안내', '행정 서식', '강사 공유', '기타')),
  visibility text not null default 'staff' check (visibility in ('private', 'staff', 'class', 'everyone')),
  target_class text check (char_length(target_class) <= 50),
  file_path text check (char_length(file_path) <= 500),
  file_name text check (char_length(file_name) <= 200),
  file_size bigint check (file_size between 0 and 52428800),
  mime text check (char_length(mime) <= 100),
  link_url text check (char_length(link_url) <= 500 and link_url ~ '^https://'),
  uploaded_by uuid references auth.users (id) on delete set null,
  uploader_name text,
  uploader_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (file_path is not null or link_url is not null),
  check (visibility <> 'class' or target_class is not null)
);
create index library_items_academy_idx on public.library_items (academy_id, created_at desc);
create unique index library_items_path_uniq on public.library_items (file_path) where file_path is not null;
comment on table public.library_items is '자료실 (공유 범위: 나만 · 원장·강사 · 반 · 모두, 원장은 전부)';

-- 이 자료를 볼 수 있는지 (표 정책 · Storage 정책이 같이 써요)
create function private.can_see_library(aid uuid, vis text, cls text, uploader uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.academy_role(aid) = 'owner' then true
    when uploader = (select auth.uid()) and private.academy_role(aid) is not null then true
    when vis = 'staff' then private.academy_role(aid) = 'teacher'
    when vis = 'everyone' then private.academy_role(aid) is not null
    when vis = 'class' then private.academy_role(aid) = 'teacher' or private.child_in_class(aid, cls)
    else false end;
$$;
revoke execute on function private.can_see_library(uuid, text, text, uuid) from public, anon;
grant execute on function private.can_see_library(uuid, text, text, uuid) to authenticated;

create function private.fill_library_uploader()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.uploaded_by := (select auth.uid());
    new.uploader_role := private.academy_role(new.academy_id);
    select coalesce(p.name, p.username) into new.uploader_name from public.profiles p where p.id = new.uploaded_by;
    -- 파일 경로는 반드시 "우리 학원 id/…"
    if new.file_path is not null and split_part(new.file_path, '/', 1) <> new.academy_id::text then raise exception 'bad_path'; end if;
  else
    new.file_path := old.file_path; new.file_name := old.file_name; new.file_size := old.file_size; new.mime := old.mime;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function private.fill_library_uploader() from public, anon, authenticated;
create trigger library_items_fill before insert or update on public.library_items
  for each row execute function private.fill_library_uploader();

alter table public.library_items enable row level security;
create policy "공유 범위에 맞게 볼 수 있음" on public.library_items for select to authenticated
  using (private.can_see_library(academy_id, visibility, target_class, uploaded_by));
create policy "원장·강사가 자료를 올림" on public.library_items for insert to authenticated
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "올린 사람과 원장이 자료를 고침" on public.library_items for update to authenticated
  using (uploaded_by = (select auth.uid()) or private.academy_role(academy_id) = 'owner')
  with check (private.academy_role(academy_id) in ('owner', 'teacher'));
create policy "올린 사람과 원장이 자료를 지움" on public.library_items for delete to authenticated
  using (uploaded_by = (select auth.uid()) or private.academy_role(academy_id) = 'owner');

revoke all on public.library_items from anon, authenticated;
grant select, delete on public.library_items to authenticated;
grant insert (academy_id, title, description, category, visibility, target_class, file_path, file_name, file_size, mime, link_url) on public.library_items to authenticated;
grant update (title, description, category, visibility, target_class, link_url) on public.library_items to authenticated;

/* ---------- Storage: 비공개 버킷, 50MB까지 ---------- */
insert into storage.buckets (id, name, public, file_size_limit)
  values ('library', 'library', false, 52428800)
  on conflict (id) do update set public = false, file_size_limit = 52428800;

-- 파일 읽기: 그 파일을 가리키는 자료를 볼 수 있을 때만
create function private.can_read_library_file(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.library_items i
                 where i.file_path = p_path and private.can_see_library(i.academy_id, i.visibility, i.target_class, i.uploaded_by));
$$;
revoke execute on function private.can_read_library_file(text) from public, anon;
grant execute on function private.can_read_library_file(text) to authenticated;

-- 첫 폴더(학원 id)에서 내 역할
create function private.library_folder_role(p_path text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare aid uuid;
begin
  begin aid := split_part(p_path, '/', 1)::uuid; exception when others then return null; end;
  return private.academy_role(aid);
end;
$$;
revoke execute on function private.library_folder_role(text) from public, anon;
grant execute on function private.library_folder_role(text) to authenticated;

create policy "자료실 파일 읽기" on storage.objects for select to authenticated
  using (bucket_id = 'library' and private.can_read_library_file(name));
create policy "자료실 파일 올리기 (원장·강사)" on storage.objects for insert to authenticated
  with check (bucket_id = 'library' and private.library_folder_role(name) in ('owner', 'teacher'));
create policy "자료실 파일 지우기 (올린 사람·원장)" on storage.objects for delete to authenticated
  using (bucket_id = 'library' and (owner_id = (select auth.uid())::text or private.library_folder_role(name) = 'owner'));

-- 학원지원센터 개선창: 쓰는 사람 누구나 "이렇게 바뀌면 좋겠어요"를 올리고, 답글 · 좋아요를 달아요.
-- 익명 없이 이름 · 학원 · 역할 · 직책이 함께 보여요(트리거가 채워서 화면이 바꿀 수 없어요).
-- 진행 단계(status)와 센터 답변(admin_note)은 센터 관리자만 바꿔요.
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  author_name text, author_role text, author_title text,
  academy_id uuid references public.academies (id) on delete set null, academy_name text,
  category text not null default 'feature' check (category in ('feature', 'screen', 'bug', 'etc')),
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 1 and 3000),
  status text not null default 'new' check (status in ('new', 'review', 'planned', 'done', 'hold')),
  admin_note text check (char_length(admin_note) <= 2000), admin_note_by text, admin_note_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz
);
create index if not exists ideas_created on public.ideas (created_at desc);

create table if not exists public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  author_name text, author_role text, author_title text,
  academy_id uuid references public.academies (id) on delete set null, academy_name text,
  is_admin boolean not null default false,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists idea_comments_idea on public.idea_comments (idea_id, created_at);

create table if not exists public.idea_likes (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

alter table public.ideas enable row level security;
alter table public.idea_comments enable row level security;
alter table public.idea_likes enable row level security;

-- 로그인한 사람은 누구나 보고 · 올리고, 고치기 · 지우기는 쓴 사람(센터 관리자는 단계 · 답변 · 지우기)
drop policy if exists "개선창 보기" on public.ideas;
drop policy if exists "개선창 올리기" on public.ideas;
drop policy if exists "개선창 고치기" on public.ideas;
drop policy if exists "개선창 지우기" on public.ideas;
create policy "개선창 보기" on public.ideas for select to authenticated using (true);
create policy "개선창 올리기" on public.ideas for insert to authenticated with check (user_id = (select auth.uid()));
create policy "개선창 고치기" on public.ideas for update to authenticated
  using (user_id = (select auth.uid()) or private.is_center_admin()) with check (true);
create policy "개선창 지우기" on public.ideas for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_center_admin());
revoke insert, update, delete on public.ideas from authenticated;
grant select, delete on public.ideas to authenticated;
grant insert (academy_id, category, title, body) on public.ideas to authenticated;
grant update (category, title, body, status, admin_note) on public.ideas to authenticated;

drop policy if exists "개선창 답글 보기" on public.idea_comments;
drop policy if exists "개선창 답글 쓰기" on public.idea_comments;
drop policy if exists "개선창 답글 지우기" on public.idea_comments;
create policy "개선창 답글 보기" on public.idea_comments for select to authenticated using (true);
create policy "개선창 답글 쓰기" on public.idea_comments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "개선창 답글 지우기" on public.idea_comments for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_center_admin());
revoke insert, update, delete on public.idea_comments from authenticated;
grant select, delete on public.idea_comments to authenticated;
grant insert (idea_id, academy_id, body) on public.idea_comments to authenticated;

drop policy if exists "개선창 좋아요 보기" on public.idea_likes;
drop policy if exists "개선창 좋아요 누르기" on public.idea_likes;
drop policy if exists "개선창 좋아요 풀기" on public.idea_likes;
create policy "개선창 좋아요 보기" on public.idea_likes for select to authenticated using (true);
create policy "개선창 좋아요 누르기" on public.idea_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "개선창 좋아요 풀기" on public.idea_likes for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.idea_likes from authenticated;
grant select, delete on public.idea_likes to authenticated;
grant insert (idea_id) on public.idea_likes to authenticated;

-- 누가 썼는지: 이름 · 그 학원 역할 · 직책 · 학원 이름 (그 학원 사람이 아니면 학원은 비워요, 센터 관리자는 "학원지원센터")
create or replace function private.idea_author(p_academy uuid, out o_academy uuid, out o_name text, out o_role text, out o_title text, out o_acad_name text)
language plpgsql stable security definer set search_path = '' as $$
declare r text;
begin
  o_name := private.who_label();
  r := case when p_academy is null then null else private.academy_role(p_academy) end;
  if r is not null then
    o_academy := p_academy; o_role := r;
    select nullif(trim(m.title), '') into o_title from public.academy_members m where m.academy_id = p_academy and m.user_id = (select auth.uid());
    select a.name into o_acad_name from public.academies a where a.id = p_academy;
  elsif private.is_center_admin() then
    o_role := 'admin'; o_acad_name := '학원지원센터';
  elsif private.my_partner() is not null then
    o_role := 'partner'; o_acad_name := private.my_partner();
  end if;
end $$;
revoke execute on function private.idea_author(uuid) from public, anon, authenticated;

create or replace function private.idea_stamp() returns trigger language plpgsql security definer set search_path = '' as $$
declare w record; adm boolean := private.is_center_admin();
begin
  if tg_op = 'INSERT' then
    select * into w from private.idea_author(new.academy_id);
    new.user_id := (select auth.uid()); new.academy_id := w.o_academy; new.author_name := w.o_name; new.author_role := w.o_role;
    new.author_title := w.o_title; new.academy_name := w.o_acad_name; new.created_at := now(); new.updated_at := null;
    new.status := 'new'; new.admin_note := null; new.admin_note_by := null; new.admin_note_at := null;
    return new;
  end if;
  -- 고치기: 쓴 사람 칸은 그대로
  new.user_id := old.user_id; new.author_name := old.author_name; new.author_role := old.author_role; new.author_title := old.author_title;
  new.academy_id := old.academy_id; new.academy_name := old.academy_name; new.created_at := old.created_at;
  -- 단계 · 센터 답변은 센터 관리자만
  if not adm then new.status := old.status; new.admin_note := old.admin_note; end if;
  if new.admin_note is distinct from old.admin_note then
    new.admin_note := nullif(trim(coalesce(new.admin_note, '')), ''); new.admin_note_by := private.who_label(); new.admin_note_at := now();
  else new.admin_note_by := old.admin_note_by; new.admin_note_at := old.admin_note_at; end if;
  -- 글은 쓴 사람만 (센터 관리자가 남의 글을 바꾸지 않게)
  if old.user_id is distinct from (select auth.uid()) then new.title := old.title; new.body := old.body; new.category := old.category; end if;
  if (new.title, new.body, new.category) is distinct from (old.title, old.body, old.category) then new.updated_at := now(); else new.updated_at := old.updated_at; end if;
  return new;
end $$;
revoke execute on function private.idea_stamp() from public, anon, authenticated;
drop trigger if exists idea_stamp on public.ideas;
create trigger idea_stamp before insert or update on public.ideas for each row execute function private.idea_stamp();

create or replace function private.idea_comment_stamp() returns trigger language plpgsql security definer set search_path = '' as $$
declare w record;
begin
  select * into w from private.idea_author(new.academy_id);
  new.user_id := (select auth.uid()); new.academy_id := w.o_academy; new.author_name := w.o_name; new.author_role := w.o_role;
  new.author_title := w.o_title; new.academy_name := w.o_acad_name; new.is_admin := private.is_center_admin(); new.created_at := now();
  return new;
end $$;
revoke execute on function private.idea_comment_stamp() from public, anon, authenticated;
drop trigger if exists idea_comment_stamp on public.idea_comments;
create trigger idea_comment_stamp before insert on public.idea_comments for each row execute function private.idea_comment_stamp();

-- 글쓴이에게 휴대폰 알림: 답글이 달리거나 센터가 단계 · 답변을 바꾸면
create or replace function private.push_idea() returns trigger language plpgsql security definer set search_path = '' as $$
declare i record; st text;
begin
  if tg_table_name = 'idea_comments' then
    select * into i from public.ideas where id = new.idea_id;
    if i.user_id is not null and i.user_id is distinct from new.user_id then
      perform private.push(array[i.user_id], 'notice', '개선창 답글 · ' || left(i.title, 40),
        coalesce(new.author_name, '') || ': ' || left(new.body, 80), '/app#ideas/' || i.id, 'idea-' || i.id);
    end if;
  elsif new.user_id is not null and new.user_id is distinct from (select auth.uid())
        and (new.status is distinct from old.status or new.admin_note is distinct from old.admin_note) then
    st := case new.status when 'review' then '검토 중' when 'planned' then '만들 예정' when 'done' then '반영 완료' when 'hold' then '보류' else '접수' end;
    perform private.push(array[new.user_id], 'notice', '개선창 · ' || st, left(new.title, 60) || coalesce(' — ' || left(new.admin_note, 60), ''), '/app#ideas/' || new.id, 'idea-' || new.id);
  end if;
  return null;
end $$;
revoke execute on function private.push_idea() from public, anon, authenticated;
drop trigger if exists push_idea on public.idea_comments;
create trigger push_idea after insert on public.idea_comments for each row execute function private.push_idea();
drop trigger if exists push_idea on public.ideas;
create trigger push_idea after update on public.ideas for each row execute function private.push_idea();

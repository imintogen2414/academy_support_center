-- 상담 · 원생: 생년월일 · 학생 본인 연락처(성인 · 고등학생), 등록할 때 함께 옮겨요
-- 첫 화면: 접수 번호 + 연락처로 내 문의 · 지원 신청 진행 상황 보기

alter table public.leads
  add column birth date,
  add column phone text check (char_length(phone) <= 30);
alter table public.students
  add column birth date,
  add column phone text check (char_length(phone) <= 30);
grant insert (birth, phone) on public.leads to authenticated;
grant update (birth, phone) on public.leads to authenticated;
grant insert (birth, phone) on public.students to authenticated;
grant update (birth, phone) on public.students to authenticated;

create or replace function private.leads_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.stage = 'enrolled' and new.student_id is null then
    insert into public.students (academy_id, name, grade, class_name, parent_name, parent_phone, birth, phone, memo)
      values (new.academy_id, new.student_name, new.grade, new.want, new.parent_name, new.parent_phone, new.birth, new.phone,
              left('상담에서 등록 · ' || coalesce(new.source, '경로 미입력'), 500))
      returning id into new.student_id;
    new.urgent := false;
  end if;
  return new;
end;
$$;

-- 가입 전에도: 접수 번호(8자리) + 남긴 연락처가 맞으면 진행 상황 · 답변을 보여 줘요
create function public.check_my_request(p_no text, p_phone text)
returns table(kind text, status text, category text, message text, answer text, answered_at timestamptz, created_at timestamptz, needs text[])
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select upper(regexp_replace(coalesce(p_no, ''), '[^0-9A-Za-z]', '', 'g')) as no,
           regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') as ph
  )
  select 'inquiry', i.status, i.category, i.message, i.answer, i.answered_at, i.created_at, null::text[]
    from public.inquiries i, q
   where length(q.no) = 8 and length(q.ph) >= 9
     and upper(left(replace(i.id::text, '-', ''), 8)) = q.no
     and regexp_replace(coalesce(i.contact, ''), '[^0-9]', '', 'g') = q.ph
  union all
  select 'support', r.status, null, r.memo, null, null, r.created_at, r.needs
    from public.support_requests r, q
   where length(q.no) = 8 and length(q.ph) >= 9
     and upper(left(replace(r.id::text, '-', ''), 8)) = q.no
     and regexp_replace(coalesce(r.phone, ''), '[^0-9]', '', 'g') = q.ph;
$$;
revoke execute on function public.check_my_request(text, text) from public;
grant execute on function public.check_my_request(text, text) to anon, authenticated;

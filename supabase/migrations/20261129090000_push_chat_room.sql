-- 채팅 알림: 누르면 그 대화방이 바로 열리게(#messages/방), 사진 · 파일은 "사진 3장" · "파일 2개"처럼 미리보기
create or replace function private.push_message() returns trigger language plpgsql security definer set search_path = ''
as $$
declare who text; room text; k text; tgt uuid[]; nf int := jsonb_array_length(coalesce(new.files, '[]')); ni int; preview text;
begin
  select coalesce(p.name, p.username, '누군가') into who from public.profiles p where p.id = new.sender_id;
  select c.kind, c.title into k, room from public.conversations c where c.id = new.conversation_id;
  select array_agg(m.user_id) into tgt from public.conversation_members m where m.conversation_id = new.conversation_id and m.user_id <> new.sender_id;
  select count(*) into ni from jsonb_array_elements(coalesce(new.files, '[]')) f where coalesce(f->>'type', f->>'mime', '') like 'image/%';
  preview := case when coalesce(new.body, '') <> '' and new.body !~ '^\[(사진|파일) ' then new.body
    when nf > 0 and ni = nf then '사진 ' || nf || '장'
    when nf > 0 then '파일 ' || nf || '개' else coalesce(nullif(new.body, ''), '새 메시지') end;
  perform private.push(tgt, 'chat', case when k = 'group' and room is not null then room || ' · ' || who else who end,
    preview, '/app#messages/' || new.conversation_id, 'chat-' || new.conversation_id);
  return null;
end $$;

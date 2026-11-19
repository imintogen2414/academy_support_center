-- 되돌리기: 한 번 저장에 요청이 여러 번 가는 화면(시간표 "같은 수업 모두" 등)도 한 줄 · 한 번에 되돌리기
-- 같은 사람이 3초 안에 잇달아 보낸 요청(batch)들을 "한 일"로 묶어요(private.change_groups).
-- change_list는 batches 배열을, undo_change는 batch 배열(p_batches)을 받아요. undo_of도 배열.

alter table public.change_logs alter column undo_of type bigint[] using case when undo_of is null then null else array[undo_of] end;

create or replace function private.log_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o jsonb; n jsonb; a uuid; u text := nullif(current_setting('asc.undo_of', true), '');
begin
  if tg_op = 'INSERT' then n := to_jsonb(new);
  elsif tg_op = 'DELETE' then o := to_jsonb(old);
  else o := to_jsonb(old); n := to_jsonb(new); if o = n then return null; end if;
  end if;
  a := (coalesce(n, o) ->> 'academy_id')::uuid;
  if a is null or coalesce(n, o) ->> 'id' is null then return null; end if;
  insert into public.change_logs (academy_id, batch, tbl, row_id, action, old_row, new_row, by_id, undo_of)
  values (a, txid_current(), tg_table_name, coalesce(n, o) ->> 'id', lower(tg_op), o, n, auth.uid(),
          case when u is null then null else string_to_array(u, ',')::bigint[] end);
  return null;
exception when others then
  raise warning 'change log failed: %', sqlerrm;
  return null;
end $$;

create or replace function private.change_groups(p_academy uuid, p_role text, p_me uuid)
returns table (g bigint, batch bigint)
language sql stable security definer set search_path = '' as $$
  with b as (
    select l.batch, (array_agg(l.by_id order by l.id))[1] by_id, min(l.created_at) t0, max(l.created_at) t1, bool_or(l.undo_of is not null) und
    from public.change_logs l
    where l.academy_id = p_academy and (p_role = 'owner' or l.by_id = p_me)
    group by l.batch
  ), s as (
    select b.*, case when lag(b.batch) over w is null
        or lag(b.by_id) over w is distinct from b.by_id
        or b.und or lag(b.und) over w
        or b.t0 - lag(b.t1) over w > interval '3 seconds' then 1 else 0 end st
    from b window w as (order by b.batch)
  )
  select sum(st) over (order by s.batch) g, s.batch from s
$$;
revoke all on function private.change_groups(uuid, text, uuid) from public;

drop function if exists public.change_list(uuid, bigint, int);
create or replace function public.change_list(p_academy uuid, p_before bigint default null, p_limit int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r text := private.academy_role(p_academy); me uuid := auth.uid();
begin
  if me is null or r is null or r not in ('owner', 'teacher') then raise exception 'not_allowed'; end if;
  return coalesce((
    with gr as (select * from private.change_groups(p_academy, r, me)),
    pick as (select gr.g from gr group by gr.g having p_before is null or min(gr.batch) < p_before
             order by min(gr.batch) desc limit least(greatest(p_limit, 1), 100)),
    s as (
      select gr.g, array_agg(distinct l.batch) batches, min(l.batch) first_batch, max(l.id) last_id, min(l.created_at) at,
        (array_agg(l.by_id order by l.id))[1] by_id, bool_and(l.by_id is not distinct from me) mine,
        bool_and(l.undone_at is not null) all_undone, bool_or(l.undone_at is not null) any_undone,
        max(l.undone_at) undone_at, (array_agg(l.undone_by order by l.undone_at desc nulls last))[1] undone_by,
        (array_agg(l.undo_of) filter (where l.undo_of is not null))[1] undo_of, count(*) n,
        jsonb_agg(jsonb_build_object('tbl', l.tbl, 'action', l.action, 'old', l.old_row, 'new', l.new_row) order by l.id) items
      from gr join public.change_logs l on l.batch = gr.batch and l.academy_id = p_academy and (r = 'owner' or l.by_id = me)
      where gr.g in (select g from pick)
      group by gr.g
    )
    select jsonb_agg(jsonb_build_object(
      'batch', s.first_batch, 'batches', s.batches, 'at', s.at,
      'by_name', coalesce((select coalesce(p.name, p.username) from public.profiles p where p.id = s.by_id), case when s.by_id is null then '자동 처리' end),
      'mine', s.mine, 'undone_at', case when s.all_undone then s.undone_at end,
      'undone_by_name', case when s.all_undone then (select coalesce(p.name, p.username) from public.profiles p where p.id = s.undone_by) end,
      'undo_of', s.undo_of, 'n', s.n,
      'can_undo', not s.any_undone and (r = 'owner' or s.mine),
      'items', (select jsonb_agg(e) from (select e from jsonb_array_elements(s.items) e limit 40) z)
    ) order by s.last_id desc) from s
  ), '[]'::jsonb);
end $$;

drop function if exists public.undo_change(uuid, bigint, boolean);
create or replace function public.undo_change(p_academy uuid, p_batches bigint[], p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r text := private.academy_role(p_academy); me uuid := auth.uid();
  l record; cur jsonb; cols text; ucols text; nchanged int := 0; prev bigint[];
begin
  if me is null or r is null or r not in ('owner', 'teacher') then raise exception 'not_allowed'; end if;
  if coalesce(array_length(p_batches, 1), 0) = 0 or array_length(p_batches, 1) > 200 then raise exception 'bad_input'; end if;
  if not exists (select 1 from public.change_logs where academy_id = p_academy and batch = any (p_batches)) then raise exception 'not_found'; end if;
  if r <> 'owner' and exists (select 1 from public.change_logs where academy_id = p_academy and batch = any (p_batches) and by_id is distinct from me) then
    raise exception 'not_allowed';
  end if;
  if exists (select 1 from public.change_logs where academy_id = p_academy and batch = any (p_batches) and undone_at is not null) then
    return jsonb_build_object('error', 'already');
  end if;

  for l in select distinct on (tbl, row_id) * from public.change_logs
           where academy_id = p_academy and batch = any (p_batches) order by tbl, row_id, id desc loop
    execute format('select to_jsonb(t) from public.%I t where t.id::text = $1', l.tbl) into cur using l.row_id;
    if (l.action = 'delete' and cur is not null)
       or (l.action <> 'delete' and (cur is null or private.jstrip(cur) <> private.jstrip(l.new_row))) then
      nchanged := nchanged + 1;
    end if;
  end loop;
  if nchanged > 0 and not p_force then return jsonb_build_object('changed', nchanged); end if;

  perform set_config('asc.undo_of', array_to_string(p_batches, ','), true);
  begin
    for l in select * from public.change_logs where academy_id = p_academy and batch = any (p_batches) order by id desc loop
      if l.action = 'insert' then
        execute format('delete from public.%I t where t.id::text = $1', l.tbl) using l.row_id;
      elsif l.action = 'delete' then
        select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position) into cols
        from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = l.tbl and c.is_generated = 'NEVER' and c.identity_generation is null
          and l.old_row ? c.column_name;
        execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) on conflict (id) do nothing',
          l.tbl, cols, cols, l.tbl) using l.old_row;
      else
        select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position) into ucols
        from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = l.tbl and c.is_generated = 'NEVER' and c.identity_generation is null
          and c.column_name <> 'id' and l.old_row ? c.column_name;
        if ucols is not null then
          execute format('update public.%I t set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where t.id::text = $2',
            l.tbl, ucols, ucols, l.tbl) using l.old_row, l.row_id;
        end if;
      end if;
    end loop;
  exception when others then
    perform set_config('asc.undo_of', '', true);
    raise exception 'undo_failed: %', sqlerrm;
  end;
  perform set_config('asc.undo_of', '', true);

  update public.change_logs set undone_at = now(), undone_by = me where academy_id = p_academy and batch = any (p_batches);
  select array_agg(distinct x) into prev from public.change_logs, unnest(undo_of) x where academy_id = p_academy and batch = any (p_batches);
  if prev is not null then
    update public.change_logs set undone_at = null, undone_by = null where academy_id = p_academy and batch = any (prev);
  end if;
  return jsonb_build_object('ok', true, 'changed', nchanged);
end $$;

revoke all on function public.change_list(uuid, bigint, int) from public, anon;
revoke all on function public.undo_change(uuid, bigint[], boolean) from public, anon;
grant execute on function public.change_list(uuid, bigint, int) to authenticated;
grant execute on function public.undo_change(uuid, bigint[], boolean) to authenticated;

-- 예전 화면(batch 하나를 보냄)도 되게: 그 batch가 들어 있는 "한 일" 전체를 되돌려요
create or replace function public.undo_change(p_academy uuid, p_batch bigint, p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r text := private.academy_role(p_academy); me uuid := auth.uid(); bs bigint[];
begin
  if me is null or r is null or r not in ('owner', 'teacher') then raise exception 'not_allowed'; end if;
  select array_agg(c.batch) into bs from private.change_groups(p_academy, r, me) c
  where c.g = (select x.g from private.change_groups(p_academy, r, me) x where x.batch = p_batch);
  return public.undo_change(p_academy, coalesce(bs, array[p_batch]), p_force);
end $$;
revoke all on function public.undo_change(uuid, bigint, boolean) from public, anon;
grant execute on function public.undo_change(uuid, bigint, boolean) to authenticated;

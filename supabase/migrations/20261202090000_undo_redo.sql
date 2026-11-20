-- 되돌리기 · 다시 하기 버튼(동그라미 두 개): 되돌리기를 되돌리고 또 되돌려도 상태가 맞게
-- 다시 하기를 되돌리면(= 다시 되돌림) 원래 일도 다시 "되돌린 상태"가 돼요.
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
    -- 살아난 일이 "되돌리기"였다면, 그 되돌리기가 없앤 일은 다시 "되돌린 상태"로 (되돌리기 · 다시 하기를 여러 번 오가도 맞게)
    update public.change_logs c set undone_at = now(), undone_by = me
    where c.academy_id = p_academy and c.undone_at is null
      and c.batch in (select y from public.change_logs l2, unnest(l2.undo_of) y where l2.academy_id = p_academy and l2.batch = any (prev));
  end if;
  return jsonb_build_object('ok', true, 'changed', nchanged);
end $$;

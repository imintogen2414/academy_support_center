-- 되돌리기: 학원 자료를 넣고 · 고치고 · 지운 것을 한 번에 이전으로
-- 표마다 트리거(private.log_change)가 바뀌기 전 · 뒤 줄을 change_logs에 남겨요. 한 번에 한 일(같은 트랜잭션)은 batch 하나.
-- 원장은 우리 학원 것 전부, 강사는 내가 한 것만 보고 되돌려요(change_list · undo_change). 되돌린 것도 기록이라 다시 되돌릴 수 있어요.
-- 60일 지난 기록은 매일 지워요.

create table if not exists public.change_logs (
  id bigserial primary key,
  academy_id uuid not null references public.academies(id) on delete cascade,
  batch bigint not null,
  tbl text not null,
  row_id text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_row jsonb,
  new_row jsonb,
  by_id uuid,
  undo_of bigint,
  undone_at timestamptz,
  undone_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists change_logs_acad on public.change_logs (academy_id, batch desc);
create index if not exists change_logs_batch on public.change_logs (batch);
alter table public.change_logs enable row level security; -- 정책 없음: RPC로만
revoke all on public.change_logs from anon, authenticated;

create or replace function private.log_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o jsonb; n jsonb; a uuid;
begin
  if tg_op = 'INSERT' then n := to_jsonb(new);
  elsif tg_op = 'DELETE' then o := to_jsonb(old);
  else o := to_jsonb(old); n := to_jsonb(new); if o = n then return null; end if;
  end if;
  a := (coalesce(n, o) ->> 'academy_id')::uuid;
  if a is null or coalesce(n, o) ->> 'id' is null then return null; end if;
  insert into public.change_logs (academy_id, batch, tbl, row_id, action, old_row, new_row, by_id, undo_of)
  values (a, txid_current(), tg_table_name, coalesce(n, o) ->> 'id', lower(tg_op), o, n, auth.uid(),
          nullif(current_setting('asc.undo_of', true), '')::bigint);
  return null;
exception when others then
  raise warning 'change log failed: %', sqlerrm;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['students', 'attendance', 'invoices', 'expenses', 'incomes', 'paperwork', 'payroll',
    'timetable', 'academy_events', 'notices', 'library_items', 'library_folders', 'tuition_plans', 'discount_presets',
    'fixed_costs', 'supplies', 'leads', 'lead_notes', 'student_todos', 'growth_reports', 'fin_accounts',
    'abroad_promos', 'academy_titles', 'app_records', 'job_posts', 'payee_accounts']
  loop
    execute format('drop trigger if exists zz_change_log on public.%I', t);
    execute format('create trigger zz_change_log after insert or update or delete on public.%I for each row execute function private.log_change()', t);
  end loop;
end $$;

-- 비교할 때 "고친 시각 · 고친 사람" 같은 칸은 빼요
create or replace function private.jstrip(j jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(j) e(k, v)
  where k not like 'updated%' and k not like 'edited%'
$$;

-- 되돌리는 동안에는 휴대폰 알림을 보내지 않아요
create or replace function private.push(p_users uuid[], p_kind text, p_title text, p_body text, p_url text, p_tag text default null)
returns void language plpgsql security definer set search_path = '' as $function$
declare n int; u text; s text;
begin
  if current_setting('asc.undo_of', true) is not null and current_setting('asc.undo_of', true) <> '' then return; end if;
  insert into public.push_outbox (user_id, kind, title, body, url, tag)
  select distinct x, p_kind, left(p_title, 80), left(coalesce(p_body, ''), 200), p_url, p_tag
  from unnest(p_users) x
  where x is not null and exists (select 1 from public.push_subs s where s.user_id = x and p_kind = any (s.kinds));
  get diagnostics n = row_count;
  if n = 0 then return; end if;
  select decrypted_secret into u from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into s from vault.decrypted_secrets where name = 'push_hook';
  if u is null or s is null then return; end if;
  perform net.http_post(url := u, body := '{}'::jsonb, headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', s), timeout_milliseconds := 5000);
exception when others then
  raise warning 'push failed: %', sqlerrm;
end $function$;

-- 바뀐 기록 목록 (한 번에 한 일씩, 최근 것부터)
create or replace function public.change_list(p_academy uuid, p_before bigint default null, p_limit int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r text := private.academy_role(p_academy); me uuid := auth.uid();
begin
  if me is null or r is null or r not in ('owner', 'teacher') then raise exception 'not_allowed'; end if;
  return coalesce((
    select jsonb_agg(bb.b order by s.last_id desc) from (
      select max(l.id) last_id, l.batch, min(l.created_at) at,
        (array_agg(l.by_id order by l.id))[1] by_id,
        bool_and(l.by_id is not distinct from me) mine,
        max(l.undone_at) undone_at, (array_agg(l.undone_by order by l.id))[1] undone_by,
        max(l.undo_of) undo_of, count(*) n,
        jsonb_agg(jsonb_build_object('tbl', l.tbl, 'action', l.action, 'old', l.old_row, 'new', l.new_row) order by l.id) items
      from public.change_logs l
      where l.academy_id = p_academy and (r = 'owner' or l.by_id = me)
        and (p_before is null or l.batch < p_before)
        and l.batch in (select distinct x.batch from public.change_logs x
                        where x.academy_id = p_academy and (r = 'owner' or x.by_id = me)
                          and (p_before is null or x.batch < p_before)
                        order by x.batch desc limit least(greatest(p_limit, 1), 100))
      group by l.batch
    ) s
    cross join lateral (select jsonb_build_object(
      'batch', s.batch, 'at', s.at, 'by_name', coalesce((select coalesce(p.name, p.username) from public.profiles p where p.id = s.by_id), case when s.by_id is null then '자동 처리' end),
      'mine', s.mine, 'undone_at', s.undone_at,
      'undone_by_name', (select coalesce(p.name, p.username) from public.profiles p where p.id = s.undone_by),
      'undo_of', s.undo_of, 'n', s.n,
      'can_undo', s.undone_at is null and (r = 'owner' or s.mine),
      'items', (select jsonb_agg(e) from (select e from jsonb_array_elements(s.items) e limit 40) z),
      'last_id', s.last_id) as b) bb
  ), '[]'::jsonb);
end $$;

-- 되돌리기: 그 일에서 바뀐 줄을 거꾸로 되돌려요. 그 뒤에 또 바뀐 줄이 있으면 p_force 없이는 {changed: n}만 돌려줘요.
create or replace function public.undo_change(p_academy uuid, p_batch bigint, p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r text := private.academy_role(p_academy); me uuid := auth.uid();
  l record; cur jsonb; cols text; ucols text; nchanged int := 0; prev bigint;
begin
  if me is null or r is null or r not in ('owner', 'teacher') then raise exception 'not_allowed'; end if;
  if not exists (select 1 from public.change_logs where academy_id = p_academy and batch = p_batch) then raise exception 'not_found'; end if;
  if r <> 'owner' and exists (select 1 from public.change_logs where academy_id = p_academy and batch = p_batch and by_id is distinct from me) then
    raise exception 'not_allowed';
  end if;
  if exists (select 1 from public.change_logs where academy_id = p_academy and batch = p_batch and undone_at is not null) then
    return jsonb_build_object('error', 'already');
  end if;

  -- 그 뒤에 또 바뀌었는지 (줄마다 이 일의 마지막 모습과 지금 모습 비교)
  for l in select distinct on (tbl, row_id) * from public.change_logs
           where academy_id = p_academy and batch = p_batch order by tbl, row_id, id desc loop
    execute format('select to_jsonb(t) from public.%I t where t.id::text = $1', l.tbl) into cur using l.row_id;
    if (l.action = 'delete' and cur is not null)
       or (l.action <> 'delete' and (cur is null or private.jstrip(cur) <> private.jstrip(l.new_row))) then
      nchanged := nchanged + 1;
    end if;
  end loop;
  if nchanged > 0 and not p_force then return jsonb_build_object('changed', nchanged); end if;

  perform set_config('asc.undo_of', p_batch::text, true);
  begin
    for l in select * from public.change_logs where academy_id = p_academy and batch = p_batch order by id desc loop
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

  update public.change_logs set undone_at = now(), undone_by = me where academy_id = p_academy and batch = p_batch;
  -- 되돌린 것을 되돌리면(다시 하기) 처음 일은 다시 "되돌리지 않음"으로
  select max(undo_of) into prev from public.change_logs where academy_id = p_academy and batch = p_batch;
  if prev is not null then
    update public.change_logs set undone_at = null, undone_by = null where academy_id = p_academy and batch = prev;
  end if;
  return jsonb_build_object('ok', true, 'changed', nchanged);
end $$;

revoke all on function public.change_list(uuid, bigint, int) from public, anon;
revoke all on function public.undo_change(uuid, bigint, boolean) from public, anon;
grant execute on function public.change_list(uuid, bigint, int) to authenticated;
grant execute on function public.undo_change(uuid, bigint, boolean) to authenticated;

-- 60일 지난 기록 정리
select cron.unschedule('asc-change-logs-clean') where exists (select 1 from cron.job where jobname = 'asc-change-logs-clean');
select cron.schedule('asc-change-logs-clean', '40 18 * * *', $$delete from public.change_logs where created_at < now() - interval '60 days'$$);

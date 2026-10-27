-- 15라운드
-- 1) 수강료 · 할인 순서를 직접 정하고, 수강료는 묶음(초등 · 중등 …)으로 나눠요
alter table public.tuition_plans add column if not exists sort_order int not null default 0, add column if not exists group_name text check (char_length(group_name) <= 30);
alter table public.discount_presets add column if not exists sort_order int not null default 0;
grant insert (sort_order, group_name) on public.tuition_plans to authenticated;
grant update (sort_order, group_name) on public.tuition_plans to authenticated;
grant insert (sort_order) on public.discount_presets to authenticated;
grant update (sort_order) on public.discount_presets to authenticated;

-- 2) 고정 지출 주기: 매달(1) · 2 · 3 · 6개월 · 1년(12)에 한 번 — 시작하는 달부터 그 간격마다
alter table public.fixed_costs add column if not exists every_months int not null default 1 check (every_months in (1, 2, 3, 6, 12));
grant insert (every_months) on public.fixed_costs to authenticated;
grant update (every_months) on public.fixed_costs to authenticated;

create or replace function private.run_fixed_costs(p_academy uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  ym text := to_char((now() at time zone 'Asia/Seoul')::date, 'YYYY-MM');
  last_d int := extract(day from (date_trunc('month', today) + interval '1 month - 1 day'))::int;
  f record; v_day int; total int := 0; a record; gap int;
begin
  for a in select distinct academy_id from public.fixed_costs where active and (p_academy is null or academy_id = p_academy) loop
    declare names text[] := '{}'; begin
      for f in select * from public.fixed_costs
                where academy_id = a.academy_id and active and start_month <= ym and (end_month is null or end_month >= ym)
                  and (last_month is null or last_month < ym) order by pay_day loop
        -- 몇 달마다 나가는 것: 시작하는 달부터 셌을 때 간격이 맞는 달에만
        gap := (extract(year from to_date(ym, 'YYYY-MM'))::int * 12 + extract(month from to_date(ym, 'YYYY-MM'))::int)
             - (extract(year from to_date(f.start_month, 'YYYY-MM'))::int * 12 + extract(month from to_date(f.start_month, 'YYYY-MM'))::int);
        continue when gap % greatest(coalesce(f.every_months, 1), 1) <> 0;
        v_day := least(f.pay_day, last_d);
        if extract(day from today) >= v_day then
          insert into public.expenses (academy_id, day, category, amount, memo, fixed_id, fixed_month, need_check)
            values (f.academy_id, make_date(extract(year from today)::int, extract(month from today)::int, v_day), f.category, f.amount,
                    left(f.name || coalesce(' · ' || f.method, '') || ' · 고정 지출', 200), f.id, ym, f.vary);
          update public.fixed_costs set last_month = ym where id = f.id;
          names := names || f.name;
        end if;
      end loop;
      if cardinality(names) > 0 then
        insert into public.auto_logs (academy_id, kind, key, message)
          values (a.academy_id, 'fixed', 'fixed:' || ym || ':' || gen_random_uuid(),
                  to_char(today, 'FMMM') || '월 고정 지출 ' || cardinality(names) || '건(' || array_to_string(names[1:4], ' · ') || case when cardinality(names) > 4 then ' …' else '' end || ')을 지출에 넣었어요');
        total := total + cardinality(names);
      end if;
    end;
  end loop;
  return total;
end $$;

-- 3) 카드 단말기 승인번호: 토스 등 단말기 매출 엑셀로 납부를 맞출 때 같은 결제를 두 번 넣지 않게
alter table public.invoices add column if not exists pay_ref text check (char_length(pay_ref) <= 60);
grant update (pay_ref) on public.invoices to authenticated;
grant insert (pay_ref) on public.invoices to authenticated;

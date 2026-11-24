create index inspection_logs_employee_site_time_idx
  on public.inspection_logs (employee_id, inspection_site_id, inspected_at);

create function public.reject_duplicate_daily_inspection_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inspection_date date := (new.inspected_at at time zone 'Asia/Seoul')::date;
begin
  if new.employee_id is null or new.inspection_site_id is null then
    return new;
  end if;

  -- Serialize check and insert for the same employee, site, and Seoul date.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'inspection_logs:' || new.employee_id::text || ':' || new.inspection_site_id::text
      || ':' || (inspection_date - date '2000-01-01')::text,
    0
  ));

  if exists (
    select 1
    from public.inspection_logs as log
    where log.employee_id = new.employee_id
      and log.inspection_site_id = new.inspection_site_id
      and log.inspected_at >= (inspection_date::timestamp at time zone 'Asia/Seoul')
      and log.inspected_at < ((inspection_date + 1)::timestamp at time zone 'Asia/Seoul')
  ) then
    raise unique_violation using message = '오늘 이미 점검을 완료한 점검지입니다.';
  end if;

  return new;
end;
$$;

create trigger inspection_logs_reject_duplicate_daily
before insert on public.inspection_logs
for each row execute function public.reject_duplicate_daily_inspection_log();

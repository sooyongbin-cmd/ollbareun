create or replace function public.list_data_management_years()
returns table(year integer)
language sql stable security invoker set search_path = '' as $$
  select distinct extract(year from work_date)::integer as year
  from public.work_record where work_date is not null order by year;
$$;

create or replace function public.get_year_data_counts(p_year integer)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  date_start date;
  date_end date;
  time_start timestamptz;
  time_end timestamptz;
begin
  if p_year is null or p_year < 1000 or p_year > 9998 then raise exception '연도가 올바르지 않습니다.'; end if;
  date_start := make_date(p_year, 1, 1);
  date_end := make_date(p_year + 1, 1, 1);
  time_start := date_start::timestamp at time zone 'Asia/Seoul';
  time_end := date_end::timestamp at time zone 'Asia/Seoul';
  return jsonb_build_object(
    'work_record', (select count(*) from public.work_record where work_date >= date_start and work_date < date_end),
    'leave', (select count(*) from public.leave where start_date >= date_start and start_date < date_end),
    'public_holidays', (select count(*) from public.public_holidays where holiday_date >= date_start and holiday_date < date_end),
    'education_completions', (select count(*) from public.education_completions where work_date >= date_start and work_date < date_end),
    'inspection_logs', (select count(*) from public.inspection_logs where inspected_at >= time_start and inspected_at < time_end),
    'inspection_special_reports', (select count(*) from public.inspection_special_reports where reported_at >= time_start and reported_at < time_end)
  );
end;
$$;

create or replace function public.delete_year_data(p_year integer, p_reports jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  date_start date;
  date_end date;
  time_start timestamptz;
  time_end timestamptz;
  expected_reports jsonb;
  current_reports jsonb;
  previous_cleanup_year text := coalesce(current_setting('app.data_manage_year', true), '');
  work_count bigint;
  leave_count bigint;
  holiday_count bigint;
  education_count bigint;
  inspection_count bigint;
  report_count bigint;
begin
  if current_user <> 'service_role' then raise exception '관리자 서버에서만 자료를 삭제할 수 있습니다.'; end if;
  if p_year is null or p_year < 1000 or p_year > 9998 then raise exception '연도가 올바르지 않습니다.'; end if;
  if p_reports is null or jsonb_typeof(p_reports) <> 'array' then raise exception '특이사항 사진 삭제 목록을 확인할 수 없습니다.'; end if;
  date_start := make_date(p_year, 1, 1);
  date_end := make_date(p_year + 1, 1, 1);
  time_start := date_start::timestamp at time zone 'Asia/Seoul';
  time_end := date_end::timestamp at time zone 'Asia/Seoul';
  -- Prevent new/updated photos from being deleted without storage cleanup.
  lock table public.inspection_special_reports in share row exclusive mode;
  select coalesce(jsonb_agg(value order by value->>'id'), '[]'::jsonb)
    into expected_reports from jsonb_array_elements(p_reports);
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'photo_url', photo_url, 'photo_urls', photo_urls) order by id::text), '[]'::jsonb)
    into current_reports from public.inspection_special_reports
    where reported_at >= time_start and reported_at < time_end;
  if current_reports is distinct from expected_reports then
    raise exception '특이사항 자료가 변경되었습니다. 다시 조회한 뒤 삭제해 주세요.';
  end if;
  -- Only this service-role transaction may bypass retention triggers, for this year.
  perform set_config('app.data_manage_year', p_year::text, true);
  delete from public.work_record where work_date >= date_start and work_date < date_end;
  get diagnostics work_count = row_count;
  delete from public.leave where start_date >= date_start and start_date < date_end;
  get diagnostics leave_count = row_count;
  delete from public.public_holidays where holiday_date >= date_start and holiday_date < date_end;
  get diagnostics holiday_count = row_count;
  delete from public.education_completions where work_date >= date_start and work_date < date_end;
  get diagnostics education_count = row_count;
  delete from public.inspection_logs where inspected_at >= time_start and inspected_at < time_end;
  get diagnostics inspection_count = row_count;
  delete from public.inspection_special_reports where reported_at >= time_start and reported_at < time_end;
  get diagnostics report_count = row_count;
  perform set_config('app.data_manage_year', previous_cleanup_year, true);
  return jsonb_build_object('work_record', work_count, 'leave', leave_count, 'public_holidays', holiday_count,
    'education_completions', education_count, 'inspection_logs', inspection_count, 'inspection_special_reports', report_count);
end;
$$;

revoke all on function public.list_data_management_years() from public, anon, authenticated;
revoke all on function public.get_year_data_counts(integer) from public, anon, authenticated;
revoke all on function public.delete_year_data(integer, jsonb) from public, anon, authenticated;
grant execute on function public.list_data_management_years() to service_role;
grant execute on function public.get_year_data_counts(integer) to service_role;
grant execute on function public.delete_year_data(integer, jsonb) to service_role;

create or replace function public.guard_protect_work_record_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  employee_retired_at timestamptz;
begin
  if current_user = 'service_role' and current_setting('app.data_manage_year', true)
    = extract(year from (old.work_date))::integer::text then
    return old;
  end if;
  select retired_at into employee_retired_at
  from public.employees where id = old.employee_id;

  if employee_retired_at is not null
    and (now() at time zone 'Asia/Seoul')::date >=
      ((employee_retired_at at time zone 'Asia/Seoul')::date + interval '5 years')::date then
    return old;
  end if;

  if old.work_date < (now() at time zone 'Asia/Seoul')::date
    or old.work_intime is not null
    or old.work_outtime is not null then
    raise exception '보관기간이 끝나지 않은 근무기록은 삭제할 수 없습니다.';
  end if;

  return old;
end;
$$;

create or replace function public.guard_protect_inspection_log_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  employee_retired_at timestamptz;
begin
  if current_user = 'service_role' and current_setting('app.data_manage_year', true)
    = extract(year from (old.inspected_at at time zone 'Asia/Seoul'))::integer::text then
    return old;
  end if;
  if old.employee_id is null then
    raise exception '퇴사일을 확인할 수 없는 순찰 기록은 삭제할 수 없습니다.';
  end if;

  select retired_at into employee_retired_at
  from public.employees where id = old.employee_id;
  if employee_retired_at is null
    or (now() at time zone 'Asia/Seoul')::date <
      ((employee_retired_at at time zone 'Asia/Seoul')::date + interval '5 years')::date then
    raise exception '퇴사 후 5년 보관기간이 끝나기 전 순찰 기록을 삭제할 수 없습니다.';
  end if;

  return old;
end;
$$;

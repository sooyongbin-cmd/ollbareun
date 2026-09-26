create or replace function public.generate_assignment_daily_attendance(p_assignment_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  assignment public.work_assignments%rowtype;
  style text;
  clock_in time;
  clock_out time;
  calendar record;
  inserted_count integer := 0;
  is_day_off boolean := false;
  has_clock_in boolean := false;
  has_clock_out boolean := false;
begin
  select * into strict assignment
  from public.work_assignments
  where id = p_assignment_id
  for update;

  select e.work_style, coalesce(assignment.in_time, e.in_time), coalesce(assignment.out_time, e.out_time)
    into style, clock_in, clock_out
    from public.employees e
    where e.id = assignment.employee_id;

  if style is null or style not in ('0', '1', '2') or clock_in is null or clock_out is null then
    raise exception '근무형태 또는 출퇴근 시간이 올바르지 않습니다.';
  end if;

  delete from public.work_record
  where employee_id = assignment.employee_id
    and work_date between assignment.start_date and assignment.end_date
    and work_intime is null
    and work_outtime is null;

  for calendar in
    select assignment.start_date + n as work_day, n as offset_days
    from generate_series(0, assignment.end_date - assignment.start_date) as n
  loop
    is_day_off := false;
    has_clock_in := false;
    has_clock_out := false;

    if style = '2' then
      is_day_off := extract(isodow from calendar.work_day) in (6, 7)
        or exists (
          select 1
          from public.public_holidays holiday
          where holiday.holiday_date = calendar.work_day
            and holiday.selected = 'Y'
        );

      if is_day_off then
        insert into public.work_assignment_days_off (work_assignment_id, day_off_date)
        values (p_assignment_id, calendar.work_day)
        on conflict (work_assignment_id, day_off_date) do nothing;
      end if;

      -- A single-day night assignment still represents a shift that starts on
      -- that day and ends the following morning.
      has_clock_in := (calendar.work_day < assignment.end_date or assignment.start_date = assignment.end_date)
        and not is_day_off;
      has_clock_out := has_clock_in;
    elsif style = '0' then
      has_clock_in := true;
      has_clock_out := true;
    else
      has_clock_in := calendar.offset_days % 2 = 0 and calendar.work_day < assignment.end_date;
      has_clock_out := calendar.offset_days % 2 = 1;
    end if;

    if has_clock_in or has_clock_out then
      insert into public.work_record (
        employee_id, worksite_id, work_date, intime, outtime, intime_status, updated_at
      )
      values (
        assignment.employee_id,
        assignment.worksite_id,
        calendar.work_day,
        case when has_clock_in then (calendar.work_day + clock_in) at time zone 'Asia/Seoul' end,
        case
          when has_clock_out and style = '2'
            then ((calendar.work_day + 1) + clock_out) at time zone 'Asia/Seoul'
          when has_clock_out
            then (calendar.work_day + clock_out) at time zone 'Asia/Seoul'
        end,
        '0',
        now()
      )
      on conflict (employee_id, work_date) do update set
        worksite_id = excluded.worksite_id,
        intime = excluded.intime,
        outtime = excluded.outtime,
        intime_status = case
          when work_record.work_intime is null then '0'
          when work_record.work_outtime is not null
            and (excluded.outtime is null or work_record.work_outtime >= excluded.outtime) then '3'
          when excluded.intime is not null and work_record.work_intime > excluded.intime then '1'
          else '2'
        end,
        outtime_status = case
          when work_record.work_outtime is not null
            and excluded.outtime is not null
            and work_record.work_outtime < excluded.outtime then '4'
          else null
        end,
        updated_at = now();
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.generate_assignment_daily_attendance(uuid) from public, anon, authenticated;
grant execute on function public.generate_assignment_daily_attendance(uuid) to service_role;

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
  previous_day_has_clock_in boolean := false;
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

  delete from public.work_assignment_daily_attendance
  where work_assignment_id = p_assignment_id;

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

      has_clock_in := calendar.work_day < assignment.end_date and not is_day_off;
      has_clock_out := calendar.work_day > assignment.start_date and previous_day_has_clock_in;
    elsif style = '0' then
      has_clock_in := true;
      has_clock_out := true;
    else
      has_clock_in := calendar.offset_days % 2 = 0 and calendar.work_day < assignment.end_date;
      has_clock_out := calendar.offset_days % 2 = 1;
    end if;

    if has_clock_in or has_clock_out then
      insert into public.work_assignment_daily_attendance (work_assignment_id, work_date, intime, outtime)
      values (
        p_assignment_id,
        calendar.work_day,
        case when has_clock_in then (calendar.work_day + clock_in) at time zone 'Asia/Seoul' end,
        case when has_clock_out then (calendar.work_day + clock_out) at time zone 'Asia/Seoul' end
      );
      inserted_count := inserted_count + 1;
    end if;

    if style = '2' then
      previous_day_has_clock_in := has_clock_in;
    end if;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.generate_assignment_daily_attendance(uuid) from public, anon, authenticated;
grant execute on function public.generate_assignment_daily_attendance(uuid) to service_role;

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
    if style = '0'
       or (style = '1' and (calendar.offset_days % 2 = 1 or calendar.work_day < assignment.end_date))
       or (style = '2' and assignment.start_date < assignment.end_date) then
      if style = '2' and (
        extract(isodow from calendar.work_day) in (6, 7)
        or exists (
          select 1
          from public.public_holidays holiday
          where holiday.holiday_date = calendar.work_day
            and holiday.selected = 'Y'
        )
      ) then
        insert into public.work_assignment_days_off (work_assignment_id, day_off_date)
        values (p_assignment_id, calendar.work_day)
        on conflict (work_assignment_id, day_off_date) do nothing;
      end if;

      insert into public.work_assignment_daily_attendance (work_assignment_id, work_date, intime, outtime)
      values (
        p_assignment_id,
        calendar.work_day,
        case
          when style = '0'
            or (style = '1' and calendar.offset_days % 2 = 0 and calendar.work_day < assignment.end_date)
            or (style = '2' and calendar.work_day < assignment.end_date)
            then (calendar.work_day + clock_in) at time zone 'Asia/Seoul'
        end,
        case
          when style = '0'
            or (style = '1' and calendar.offset_days % 2 = 1)
            or (style = '2' and calendar.work_day > assignment.start_date)
            then (calendar.work_day + clock_out) at time zone 'Asia/Seoul'
        end
      );
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.generate_assignment_daily_attendance(uuid) from public, anon, authenticated;
grant execute on function public.generate_assignment_daily_attendance(uuid) to service_role;

create or replace function public.create_assignment_with_daily_attendance(
  p_employee_id uuid, p_worksite_id uuid, p_start_date date, p_end_date date,
  p_in_time time default null, p_out_time time default null
)
returns public.work_assignments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  employee public.employees%rowtype;
  assignment public.work_assignments%rowtype;
begin
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception '근무기간이 올바르지 않습니다.';
  end if;

  select * into strict employee
  from public.employees
  where id = p_employee_id
  for update;

  if exists (
    select 1
    from public.work_assignments
    where employee_id = p_employee_id
      and start_date <= p_end_date
      and end_date >= p_start_date
  ) then
    raise exception '해당 직원의 근무기간이 기존 배정과 겹칩니다.';
  end if;

  insert into public.work_assignments (employee_id, worksite_id, start_date, end_date, in_time, out_time)
    values (
      p_employee_id,
      p_worksite_id,
      p_start_date,
      p_end_date,
      coalesce(p_in_time, employee.in_time),
      coalesce(p_out_time, employee.out_time)
    )
    returning * into assignment;

  perform public.generate_assignment_daily_attendance(assignment.id);
  return assignment;
end;
$$;

revoke all on function public.create_assignment_with_daily_attendance(uuid, uuid, date, date, time, time) from public, anon, authenticated;
grant execute on function public.create_assignment_with_daily_attendance(uuid, uuid, date, date, time, time) to service_role;

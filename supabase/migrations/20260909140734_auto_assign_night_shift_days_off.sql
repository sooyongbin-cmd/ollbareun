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
  select * into strict employee from public.employees where id = p_employee_id for update;
  if exists (
    select 1 from public.work_assignments where employee_id = p_employee_id
      and start_date <= p_end_date and end_date >= p_start_date
  ) then
    raise exception '해당 직원의 근무기간이 기존 배정과 겹칩니다.';
  end if;
  insert into public.work_assignments (employee_id, worksite_id, start_date, end_date, in_time, out_time)
    values (p_employee_id, p_worksite_id, p_start_date, p_end_date,
      coalesce(p_in_time, employee.in_time), coalesce(p_out_time, employee.out_time))
    returning * into assignment;
  perform public.generate_assignment_daily_attendance(assignment.id);

  if employee.work_style = '2' then
    insert into public.work_assignment_days_off (work_assignment_id, day_off_date)
    select assignment.id, calendar.day::date
    from generate_series(p_start_date::timestamp, p_end_date::timestamp, interval '1 day') as calendar(day)
    where extract(isodow from calendar.day) in (6, 7)
       or exists (
         select 1
         from public.public_holidays holiday
         where holiday.holiday_date = calendar.day::date
           and holiday.selected = 'Y'
       )
    on conflict (work_assignment_id, day_off_date) do nothing;
  end if;

  return assignment;
end;
$$;

revoke all on function public.create_assignment_with_daily_attendance(uuid, uuid, date, date, time, time) from public, anon, authenticated;
grant execute on function public.create_assignment_with_daily_attendance(uuid, uuid, date, date, time, time) to service_role;

alter table public.employees
  alter column out_time drop default,
  alter column out_time type integer using (
    extract(hour from out_time)::integer * 60
    + extract(minute from out_time)::integer
    + case
        when work_style in ('1', '2') and out_time <= in_time then 1440
        else 0
      end
  ),
  alter column out_time set default 1800;

alter table public.work_assignments
  alter column out_time type integer using (
    case when out_time is null then null else
      extract(hour from out_time)::integer * 60
      + extract(minute from out_time)::integer
      + case
          when out_time <= in_time then 1440
          else 0
        end
    end
  );

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
  clock_out_minutes integer;
  calendar record;
  inserted_count integer := 0;
  is_day_off boolean := false;
  has_clock_in boolean := false;
  has_clock_out boolean := false;
begin
  select * into strict assignment
  from public.work_assignments where id = p_assignment_id for update;

  select e.work_style, coalesce(assignment.in_time, e.in_time), coalesce(assignment.out_time, e.out_time)
    into style, clock_in, clock_out_minutes
    from public.employees e where e.id = assignment.employee_id;

  if style is null or style not in ('0', '1', '2') or clock_in is null or clock_out_minutes is null then
    raise exception '근무형태 또는 출퇴근 시간이 올바르지 않습니다.';
  end if;

  delete from public.work_record
  where employee_id = assignment.employee_id
    and work_date between assignment.start_date and assignment.end_date
    and work_intime is null and work_outtime is null;

  for calendar in
    select assignment.start_date + n as work_day, n as offset_days
    from generate_series(0, assignment.end_date - assignment.start_date) as n
  loop
    is_day_off := false;
    has_clock_in := false;
    has_clock_out := false;

    if style = '2' then
      is_day_off := extract(isodow from calendar.work_day) in (6, 7)
        or exists (select 1 from public.public_holidays holiday
          where holiday.holiday_date = calendar.work_day and holiday.selected = 'Y');
      if is_day_off then
        insert into public.work_assignment_days_off (work_assignment_id, day_off_date)
        values (p_assignment_id, calendar.work_day)
        on conflict (work_assignment_id, day_off_date) do nothing;
      end if;
      has_clock_in := not is_day_off
        and (calendar.work_day < assignment.end_date or assignment.start_date = assignment.end_date);
      has_clock_out := not is_day_off
        and (calendar.work_day > assignment.start_date or assignment.start_date = assignment.end_date);
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
      ) values (
        assignment.employee_id,
        assignment.worksite_id,
        calendar.work_day,
        case when has_clock_in then (calendar.work_day + clock_in) at time zone 'Asia/Seoul' end,
        case when has_clock_out then
          (calendar.work_day + make_interval(mins => case
            when style = '1' then clock_out_minutes % 1440
            else clock_out_minutes
          end)) at time zone 'Asia/Seoul'
        end,
        '0', now()
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
          when work_record.work_outtime is not null and excluded.outtime is not null
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

drop function if exists public.create_assignment_with_daily_attendance(uuid, uuid, date, date, time, time);
create or replace function public.create_assignment_with_daily_attendance(
  p_employee_id uuid,
  p_worksite_id uuid,
  p_start_date date,
  p_end_date date,
  p_in_time time default null,
  p_out_time integer default null
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
  if exists (select 1 from public.work_assignments where employee_id = p_employee_id
    and start_date <= p_end_date and end_date >= p_start_date) then
    raise exception '해당 직원의 근무기간이 기존 배정과 겹칩니다.';
  end if;
  insert into public.work_assignments (employee_id, worksite_id, start_date, end_date, in_time, out_time)
  values (p_employee_id, p_worksite_id, p_start_date, p_end_date,
    coalesce(p_in_time, employee.in_time), coalesce(p_out_time, employee.out_time))
  returning * into assignment;
  perform public.generate_assignment_daily_attendance(assignment.id);
  return assignment;
end;
$$;

revoke all on function public.create_assignment_with_daily_attendance(uuid, uuid, date, date, time, integer) from public, anon, authenticated;
grant execute on function public.create_assignment_with_daily_attendance(uuid, uuid, date, date, time, integer) to service_role;

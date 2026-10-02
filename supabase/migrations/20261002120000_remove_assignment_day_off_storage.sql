-- Keep the attendance generators working without a separate assignment day-off table.
create or replace function public.generate_assignment_daily_attendance_legacy(p_assignment_id uuid)
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
  exclude_weekends boolean;
  calendar record;
  inserted_count integer := 0;
  is_day_off boolean := false;
  is_leave boolean := false;
  has_clock_in boolean := false;
  has_clock_out boolean := false;
begin
  select * into strict assignment from public.work_assignments where id = p_assignment_id for update;
  select coalesce(assignment.work_style, e.work_style), coalesce(assignment.in_time, e.in_time),
         coalesce(assignment.out_time, e.out_time), coalesce(assignment.has_weekend, e.has_weekend, true)
    into style, clock_in, clock_out_minutes, exclude_weekends
    from public.employees e where e.id = assignment.employee_id;

  if style is null or style not in ('0', '1', '2') or clock_in is null or clock_out_minutes is null then
    raise exception '근무형태 또는 출퇴근 시간이 올바르지 않습니다.';
  end if;

  delete from public.work_record where employee_id = assignment.employee_id
    and work_date between assignment.start_date and assignment.end_date
    and work_intime is null and work_outtime is null;

  for calendar in select assignment.start_date + n as work_day, n as offset_days
    from generate_series(0, assignment.end_date - assignment.start_date) as n
  loop
    is_day_off := exclude_weekends and (
      extract(isodow from calendar.work_day) in (6, 7)
      or exists (select 1 from public.public_holidays holiday where holiday.holiday_date = calendar.work_day and holiday.selected = 'Y')
    );
    if style = '2' and calendar.work_day = assignment.start_date
      and assignment.start_date < assignment.end_date and is_day_off then
      is_day_off := extract(isodow from assignment.start_date + 1) in (6, 7)
        or exists (
          select 1 from public.public_holidays holiday
          where holiday.holiday_date = assignment.start_date + 1 and holiday.selected = 'Y'
        );
    end if;
    select exists (
      select 1 from public.leave l
      where l.employee_id = assignment.employee_id
        and l.start_date <= calendar.work_day
        and l.end_date >= calendar.work_day
    ) into is_leave;
    has_clock_in := false;
    has_clock_out := false;
    if style = '2' then
      has_clock_in := not is_day_off;
      has_clock_out := has_clock_in;
    elsif not is_day_off and style = '0' then
      has_clock_in := true;
      has_clock_out := true;
    elsif not is_day_off and style = '1' then
      has_clock_in := calendar.offset_days % 2 = 0;
      has_clock_out := has_clock_in;
    end if;

    if has_clock_in or has_clock_out then
      insert into public.work_record (employee_id, worksite_id, work_date, intime, outtime, intime_status, outtime_status, updated_at)
      values (
        assignment.employee_id, assignment.worksite_id, calendar.work_day,
        case when has_clock_in then (calendar.work_day + clock_in) at time zone 'Asia/Seoul' end,
        case when has_clock_out then ((calendar.work_day + case when style = '1' then 1 else 0 end)
          + make_interval(mins => case when style = '1' then clock_out_minutes % 1440 else clock_out_minutes end)) at time zone 'Asia/Seoul' end,
        case when is_leave then '3' else '0' end, '0', now()
      )
      on conflict (employee_id, work_date) do update set
        worksite_id = excluded.worksite_id,
        intime = excluded.intime,
        outtime = excluded.outtime,
        intime_status = case
          when is_leave then '3'
          when work_record.work_intime is null then '0'
          when excluded.intime is not null and work_record.work_intime > excluded.intime then '1'
          else '2'
        end,
        outtime_status = case
          when work_record.work_outtime is null then '0'
          when excluded.outtime is not null and work_record.work_outtime < excluded.outtime then '1'
          else '2'
        end,
        updated_at = now();
      inserted_count := inserted_count + 1;
    end if;
  end loop;
  return inserted_count;
end;
$$;

create or replace function public.generate_assignment_daily_attendance(p_assignment_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  assignment public.work_assignments%rowtype;
  calendar record;
  rule public.assignment_schedule_rules%rowtype;
  calendar_day_type text;
  weekly_day_off boolean;
  working boolean;
  is_leave boolean;
  start_time time;
  end_minutes integer;
  generated integer := 0;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select * into strict assignment from public.work_assignments where id = p_assignment_id for update;
  if not assignment.schedule_rules_enabled then
    return public.generate_assignment_daily_attendance_legacy(p_assignment_id);
  end if;
  if assignment.work_style is null or assignment.in_time is null or assignment.out_time is null then
    raise exception '근무형태와 기본 출퇴근시간을 입력하세요.';
  end if;

  -- Never rewrite a historical or clocked record. Only future, unstarted schedules can be rebuilt.
  delete from public.work_record where employee_id = assignment.employee_id
    and worksite_id = assignment.worksite_id and work_date between greatest(today, assignment.start_date) and assignment.end_date
    and work_intime is null and work_outtime is null;
  for calendar in select assignment.start_date + n as work_day, n as offset_days
    from generate_series(0, assignment.end_date - assignment.start_date) as n
  loop
    if exists (select 1 from public.work_record w where w.employee_id = assignment.employee_id
      and w.work_date = calendar.work_day) then continue; end if;
    calendar_day_type := (array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])[extract(isodow from calendar.work_day)::integer];
    select * into rule from public.assignment_schedule_rules r
      where r.work_assignment_id = assignment.id and (r.day_type = calendar_day_type
        or (extract(isodow from calendar.work_day) between 1 and 5 and r.day_type = 'weekday'))
      order by (r.day_type = calendar_day_type) desc limit 1;
    weekly_day_off := coalesce(not rule.is_working_day, false);
    if exists (select 1 from public.public_holidays h where h.holiday_date = calendar.work_day
        and h.selected = 'Y' and h.holiday_type = 'public') then
      select * into rule from public.assignment_schedule_rules r
        where r.work_assignment_id = assignment.id and r.day_type = 'holiday';
    end if;
    working := not weekly_day_off and coalesce(rule.is_working_day, true);
    start_time := coalesce(rule.in_time, assignment.in_time);
    end_minutes := coalesce(rule.out_time, assignment.out_time);
    if exists (select 1 from public.public_holidays h where h.holiday_date = calendar.work_day
      and h.selected = 'Y' and h.holiday_type = 'custom') then working := false; end if;
    if assignment.work_style = '1' and calendar.offset_days % 2 = 1 then working := false; end if;
    if not working then continue; end if;

    select exists (
      select 1 from public.leave l
      where l.employee_id = assignment.employee_id
        and l.start_date <= calendar.work_day
        and l.end_date >= calendar.work_day
    ) into is_leave;
    if assignment.work_style = '1' and end_minutes < 1440 then end_minutes := end_minutes + 1440; end if;
    if end_minutes <= extract(hour from start_time)::integer * 60 + extract(minute from start_time)::integer then
      raise exception '퇴근시간은 출근시간 이후로 입력하세요.';
    end if;
    insert into public.work_record(employee_id, worksite_id, work_date, intime, outtime, intime_status, outtime_status, updated_at)
      values (assignment.employee_id, assignment.worksite_id, calendar.work_day,
        (calendar.work_day + start_time) at time zone 'Asia/Seoul',
        (calendar.work_day + make_interval(mins => end_minutes)) at time zone 'Asia/Seoul',
        case when is_leave then '3' else '0' end, '0', now())
      on conflict (employee_id, work_date) do nothing;
    generated := generated + 1;
  end loop;
  return generated;
end;
$$;

revoke all on function public.generate_assignment_daily_attendance_legacy(uuid) from public, anon, authenticated;
grant execute on function public.generate_assignment_daily_attendance_legacy(uuid) to service_role;
revoke all on function public.generate_assignment_daily_attendance(uuid) from public, anon, authenticated;
grant execute on function public.generate_assignment_daily_attendance(uuid) to service_role;

drop trigger if exists validate_work_assignment_day_off on public.work_assignment_days_off;
drop trigger if exists remove_days_off_outside_assignment_period on public.work_assignments;
drop function if exists private.validate_work_assignment_day_off();
drop function if exists private.remove_days_off_outside_assignment_period();

notify pgrst, 'reload schema';

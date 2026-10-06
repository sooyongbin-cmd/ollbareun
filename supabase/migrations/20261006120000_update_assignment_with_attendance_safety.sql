create or replace function public.update_assignment_with_daily_attendance(
  p_assignment_id uuid,
  p_employee_id uuid,
  p_worksite_id uuid,
  p_start_date date,
  p_end_date date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous_assignment public.work_assignments%rowtype;
  assignment public.work_assignments%rowtype;
  calendar record;
  rule public.assignment_schedule_rules%rowtype;
  calendar_day_type text;
  weekly_day_off boolean;
  working boolean;
  is_leave boolean;
  start_time time;
  end_minutes integer;
  style text;
  clock_in time;
  clock_out_minutes integer;
  exclude_weekends boolean;
  is_day_off boolean;
  has_clock_in boolean;
  has_clock_out boolean;
  last_attendance_date date;
  generation_start_date date;
  has_attendance boolean;
begin
  select * into strict previous_assignment
  from public.work_assignments
  where id = p_assignment_id
  for update;

  if p_employee_id is distinct from previous_assignment.employee_id then
    raise exception '배정된 직원은 변경할 수 없습니다.';
  end if;
  if p_start_date is distinct from previous_assignment.start_date then
    raise exception '근무기간 시작일은 변경할 수 없습니다.';
  end if;
  if p_worksite_id is null then
    raise exception '근무지를 선택하세요.';
  end if;
  if p_end_date < previous_assignment.start_date then
    raise exception '근무기간 종료일은 시작일 이후여야 합니다.';
  end if;

  if exists (
    select 1
    from public.work_assignments other_assignment
    where other_assignment.employee_id = previous_assignment.employee_id
      and other_assignment.id <> previous_assignment.id
      and other_assignment.start_date <= p_end_date
      and other_assignment.end_date >= previous_assignment.start_date
  ) then
    raise exception '이미 겹치는 근무기간 배정이 있습니다.';
  end if;

  if p_end_date < previous_assignment.end_date then
    select max(record.work_date)
    into last_attendance_date
    from public.work_record record
    where record.employee_id = previous_assignment.employee_id
      and record.work_date > p_end_date
      and record.work_date <= previous_assignment.end_date
      and (record.work_intime is not null or record.work_outtime is not null);

    if last_attendance_date is not null then
      raise exception '처리 범위 내 마지막 출근일자는 %이며, 해당 일자에 출근 자료가 있어 근무기간을 수정할 수 없습니다.',
        to_char(last_attendance_date, 'YYYY-MM-DD');
    end if;
  end if;

  if p_worksite_id is distinct from previous_assignment.worksite_id then
    select exists (
      select 1
      from public.work_record record
      where record.employee_id = previous_assignment.employee_id
        and record.work_date between previous_assignment.start_date and greatest(previous_assignment.end_date, p_end_date)
        and (record.work_intime is not null or record.work_outtime is not null)
    )
    into has_attendance;

    if has_attendance then
      raise exception '근무기간 중 출퇴근 기록이 있어 근무지를 변경할 수 없습니다.';
    end if;
  end if;

  if p_worksite_id is distinct from previous_assignment.worksite_id then
    update public.work_record record
    set worksite_id = p_worksite_id,
        updated_at = now()
    where record.employee_id = previous_assignment.employee_id
      and record.work_date between previous_assignment.start_date and least(previous_assignment.end_date, p_end_date)
      and record.worksite_id is distinct from p_worksite_id;
  end if;

  if p_end_date < previous_assignment.end_date then
    delete from public.work_record record
    where record.employee_id = previous_assignment.employee_id
      and record.work_date > p_end_date
      and record.work_date <= previous_assignment.end_date;
  end if;

  update public.work_assignments
  set worksite_id = p_worksite_id,
      end_date = p_end_date
  where id = p_assignment_id
  returning * into assignment;

  if p_end_date > previous_assignment.end_date then
    select max(record.work_date)
    into last_attendance_date
    from public.work_record record
    where record.employee_id = previous_assignment.employee_id
      and record.work_date > previous_assignment.end_date
      and record.work_date <= p_end_date
      and (record.work_intime is not null or record.work_outtime is not null);

    generation_start_date := greatest(
      previous_assignment.end_date + 1,
      coalesce(last_attendance_date + 1, previous_assignment.end_date + 1)
    );

    if not assignment.schedule_rules_enabled then
      select coalesce(assignment.work_style, employee.work_style),
             coalesce(assignment.in_time, employee.in_time),
             coalesce(assignment.out_time, employee.out_time),
             coalesce(assignment.has_weekend, employee.has_weekend, true)
      into style, clock_in, clock_out_minutes, exclude_weekends
      from public.employees employee
      where employee.id = assignment.employee_id;

      if style is null or style not in ('0', '1', '2') or clock_in is null or clock_out_minutes is null then
        raise exception '근무형태 또는 출퇴근 시간이 올바르지 않습니다.';
      end if;

      for calendar in
        select previous_assignment.end_date + days.offset_days as work_day,
               previous_assignment.end_date + days.offset_days - assignment.start_date as offset_days
        from generate_series(
          generation_start_date - previous_assignment.end_date,
          p_end_date - previous_assignment.end_date
        ) as days(offset_days)
      loop
        is_day_off := exclude_weekends and (
          extract(isodow from calendar.work_day) in (6, 7)
          or exists (
            select 1
            from public.public_holidays holiday
            where holiday.holiday_date = calendar.work_day
              and holiday.selected = 'Y'
          )
        );

        if style = '2'
          and calendar.work_day = assignment.start_date
          and assignment.start_date < assignment.end_date
          and is_day_off then
          is_day_off := extract(isodow from assignment.start_date + 1) in (6, 7)
            or exists (
              select 1
              from public.public_holidays holiday
              where holiday.holiday_date = assignment.start_date + 1
                and holiday.selected = 'Y'
            );
        end if;

        select exists (
          select 1
          from public.leave leave_record
          where leave_record.employee_id = assignment.employee_id
            and leave_record.start_date <= calendar.work_day
            and leave_record.end_date >= calendar.work_day
        )
        into is_leave;

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
          insert into public.work_record (
            employee_id,
            worksite_id,
            work_date,
            intime,
            outtime,
            intime_status,
            outtime_status,
            updated_at
          )
          values (
            assignment.employee_id,
            assignment.worksite_id,
            calendar.work_day,
            case when has_clock_in then (calendar.work_day + clock_in) at time zone 'Asia/Seoul' end,
            case when has_clock_out then (
              (calendar.work_day + case when style = '1' then 1 else 0 end)
              + make_interval(mins => case when style = '1' then clock_out_minutes % 1440 else clock_out_minutes end)
            ) at time zone 'Asia/Seoul' end,
            case when is_leave then '3' else '0' end,
            '0',
            now()
          )
          on conflict (employee_id, work_date) do nothing;
        end if;
      end loop;
    else
      if assignment.work_style is null or assignment.in_time is null or assignment.out_time is null then
        raise exception '근무형태와 기본 출퇴근시간을 입력하세요.';
      end if;

      for calendar in
        select previous_assignment.end_date + days.offset_days as work_day,
               previous_assignment.end_date + days.offset_days - assignment.start_date as offset_days
        from generate_series(
          generation_start_date - previous_assignment.end_date,
          p_end_date - previous_assignment.end_date
        ) as days(offset_days)
      loop
        calendar_day_type := (array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
          [extract(isodow from calendar.work_day)::integer];

        select * into rule
        from public.assignment_schedule_rules schedule_rule
        where schedule_rule.work_assignment_id = assignment.id
          and (
            schedule_rule.day_type = calendar_day_type
            or (
              extract(isodow from calendar.work_day) between 1 and 5
              and schedule_rule.day_type = 'weekday'
            )
          )
        order by (schedule_rule.day_type = calendar_day_type) desc
        limit 1;

        weekly_day_off := coalesce(not rule.is_working_day, false);
        if exists (
          select 1
          from public.public_holidays holiday
          where holiday.holiday_date = calendar.work_day
            and holiday.selected = 'Y'
            and holiday.holiday_type = 'public'
        ) then
          select * into rule
          from public.assignment_schedule_rules schedule_rule
          where schedule_rule.work_assignment_id = assignment.id
            and schedule_rule.day_type = 'holiday';
        end if;

        working := not weekly_day_off and coalesce(rule.is_working_day, true);
        start_time := coalesce(rule.in_time, assignment.in_time);
        end_minutes := coalesce(rule.out_time, assignment.out_time);

        if exists (
          select 1
          from public.public_holidays holiday
          where holiday.holiday_date = calendar.work_day
            and holiday.selected = 'Y'
            and holiday.holiday_type = 'custom'
        ) then
          working := false;
        end if;
        if assignment.work_style = '1' and calendar.offset_days % 2 = 1 then
          working := false;
        end if;
        if not working then
          continue;
        end if;

        select exists (
          select 1
          from public.leave leave_record
          where leave_record.employee_id = assignment.employee_id
            and leave_record.start_date <= calendar.work_day
            and leave_record.end_date >= calendar.work_day
        )
        into is_leave;

        if assignment.work_style = '1' and end_minutes < 1440 then
          end_minutes := end_minutes + 1440;
        end if;
        if end_minutes <= extract(hour from start_time)::integer * 60 + extract(minute from start_time)::integer then
          raise exception '퇴근시간은 출근시간 이후로 입력하세요.';
        end if;

        insert into public.work_record (
          employee_id,
          worksite_id,
          work_date,
          intime,
          outtime,
          intime_status,
          outtime_status,
          updated_at
        )
        values (
          assignment.employee_id,
          assignment.worksite_id,
          calendar.work_day,
          (calendar.work_day + start_time) at time zone 'Asia/Seoul',
          (calendar.work_day + make_interval(mins => end_minutes)) at time zone 'Asia/Seoul',
          case when is_leave then '3' else '0' end,
          '0',
          now()
        )
        on conflict (employee_id, work_date) do nothing;
      end loop;
    end if;
  end if;
end;
$$;

revoke all on function public.update_assignment_with_daily_attendance(uuid, uuid, uuid, date, date) from public, anon, authenticated;
grant execute on function public.update_assignment_with_daily_attendance(uuid, uuid, uuid, date, date) to service_role;

notify pgrst, 'reload schema';

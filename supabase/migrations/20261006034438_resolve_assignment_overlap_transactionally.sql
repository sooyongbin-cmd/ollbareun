create or replace function public.resolve_assignment_overlap_transactionally(
  p_employee_id uuid,
  p_worksite_id uuid,
  p_start_date date,
  p_end_date date,
  p_work_style text default null,
  p_has_weekend boolean default null,
  p_in_time time default null,
  p_out_time integer default null,
  p_schedule_rules jsonb default null,
  p_expected_assignment_id uuid default null,
  p_expected_start_date date default null,
  p_expected_end_date date default null
)
returns public.work_assignments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  employee public.employees%rowtype;
  old_assignment public.work_assignments%rowtype;
  new_assignment public.work_assignments%rowtype;
  tail_assignment_id uuid;
  overlap_start date;
  overlap_end date;
  attendance_date date;
  retained_history_date date;
  today date := (now() at time zone 'Asia/Seoul')::date;
  has_conflict boolean;
begin
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception '근무기간이 올바르지 않습니다.';
  end if;

  -- Serialize assignment changes with attendance writes for this employee.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_employee_id::text, 0));
  select * into strict employee
  from public.employees
  where id = p_employee_id
  for update;

  select * into old_assignment
  from public.work_assignments a
  where a.employee_id = p_employee_id
    and a.start_date <= p_end_date
    and a.end_date >= p_start_date
  order by a.start_date
  limit 1
  for update;
  has_conflict := found;

  if not has_conflict then
    if p_schedule_rules is null then
      new_assignment := public.create_assignment_with_daily_attendance(
        p_employee_id, p_worksite_id, p_start_date, p_end_date,
        p_work_style, p_has_weekend, p_in_time, p_out_time
      );
    else
      new_assignment := public.create_assignment_with_schedule_rules(
        p_employee_id, p_worksite_id, p_start_date, p_end_date,
        p_work_style, p_has_weekend, p_in_time, p_out_time, p_schedule_rules
      );
    end if;
    return new_assignment;
  end if;

  if p_expected_assignment_id is distinct from old_assignment.id
    or p_expected_start_date is distinct from old_assignment.start_date
    or p_expected_end_date is distinct from old_assignment.end_date then
    raise exception '해당 직원의 근무기간이 기존 배정과 겹칩니다.';
  end if;

  overlap_start := greatest(old_assignment.start_date, p_start_date);
  overlap_end := least(old_assignment.end_date, p_end_date);

  select w.work_date into attendance_date
  from public.work_record w
  where w.employee_id = p_employee_id
    and w.work_date between overlap_start and overlap_end
    and (w.work_intime is not null or w.work_outtime is not null)
  order by w.work_date
  limit 1;

  if attendance_date is not null then
    raise exception '근무자 (%)의 날짜 (%)에 출퇴근 이력이 있습니다. 작업을 취소합니다.',
      employee.name, to_char(attendance_date, 'YYYY-MM-DD');
  end if;

  -- Even unclocked past rows are authoritative and cannot be rebuilt.
  select min(w.work_date) into retained_history_date
  from public.work_record w
  where w.employee_id = p_employee_id
    and w.work_date < today
    and w.work_date between overlap_start and overlap_end;

  if retained_history_date is not null then
    raise exception '과거 근무기록은 보존 대상이어서 자동 조정할 수 없습니다.';
  end if;

  -- Attendance and history checks run before any write. The surrounding RPC
  -- transaction also rolls back every following change if regeneration fails.
  delete from public.work_record w
  where w.employee_id = p_employee_id
    and w.work_date between overlap_start and overlap_end;

  delete from public.work_assignment_days_off d
  where d.work_assignment_id = old_assignment.id
    and d.day_off_date between overlap_start and overlap_end;

  if old_assignment.start_date < overlap_start
    and old_assignment.end_date > overlap_end then
    -- Keep the original row for the earlier segment and clone its schedule for
    -- the later segment so both non-overlapping periods retain their settings.
    update public.work_assignments
    set end_date = overlap_start - 1
    where id = old_assignment.id;

    insert into public.work_assignments (
      employee_id, worksite_id, start_date, end_date, work_style, has_weekend,
      in_time, out_time, schedule_rules_enabled
    ) values (
      old_assignment.employee_id, old_assignment.worksite_id, overlap_end + 1,
      old_assignment.end_date, old_assignment.work_style, old_assignment.has_weekend,
      old_assignment.in_time, old_assignment.out_time, old_assignment.schedule_rules_enabled
    ) returning id into tail_assignment_id;

    insert into public.assignment_schedule_rules (
      work_assignment_id, day_type, is_working_day, in_time, out_time
    )
    select tail_assignment_id, r.day_type, r.is_working_day, r.in_time, r.out_time
    from public.assignment_schedule_rules r
    where r.work_assignment_id = old_assignment.id;

    update public.work_assignment_days_off
    set work_assignment_id = tail_assignment_id
    where work_assignment_id = old_assignment.id
      and day_off_date > overlap_end;
  elsif old_assignment.start_date < overlap_start then
    update public.work_assignments
    set end_date = overlap_start - 1
    where id = old_assignment.id;
  elsif old_assignment.end_date > overlap_end then
    update public.work_assignments
    set start_date = overlap_end + 1
    where id = old_assignment.id;
  else
    delete from public.work_assignments where id = old_assignment.id;
  end if;

  if p_schedule_rules is null then
    new_assignment := public.create_assignment_with_daily_attendance(
      p_employee_id, p_worksite_id, p_start_date, p_end_date,
      p_work_style, p_has_weekend, p_in_time, p_out_time
    );
  else
    new_assignment := public.create_assignment_with_schedule_rules(
      p_employee_id, p_worksite_id, p_start_date, p_end_date,
      p_work_style, p_has_weekend, p_in_time, p_out_time, p_schedule_rules
    );
  end if;

  return new_assignment;
end;
$$;

revoke all on function public.resolve_assignment_overlap_transactionally(
  uuid, uuid, date, date, text, boolean, time, integer, jsonb, uuid, date, date
) from public, anon, authenticated;
grant execute on function public.resolve_assignment_overlap_transactionally(
  uuid, uuid, date, date, text, boolean, time, integer, jsonb, uuid, date, date
) to service_role;

notify pgrst, 'reload schema';

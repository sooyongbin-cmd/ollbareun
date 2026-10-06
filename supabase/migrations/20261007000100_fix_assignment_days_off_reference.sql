create or replace function public.resolve_assignment_overlaps_transactionally(
  p_employee_id uuid,
  p_worksite_id uuid,
  p_start_date date,
  p_end_date date,
  p_work_style text default null,
  p_has_weekend boolean default null,
  p_in_time time default null,
  p_out_time integer default null,
  p_schedule_rules jsonb default null,
  p_expected_conflicts jsonb default null
)
returns table (assignment jsonb, adjusted_assignments jsonb)
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
  original_start_date date;
  original_end_date date;
  actual_conflicts jsonb := '[]'::jsonb;
  expected_conflicts jsonb := '[]'::jsonb;
  adjustments jsonb := '[]'::jsonb;
  new_periods jsonb;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception '근무기간이 올바르지 않습니다.';
  end if;

  -- Serialize assignment registration for this employee.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_employee_id::text, 0));
  select * into strict employee
  from public.employees
  where id = p_employee_id
  for update;

  -- Lock scheduled rows so an attendance write cannot race the guard and deletion.
  perform w.id
  from public.work_record w
  where w.employee_id = p_employee_id
    and w.work_date between p_start_date and p_end_date
  order by w.work_date
  for update;

  -- Attendance history blocks every new assignment before overlap handling begins.
  select w.work_date into attendance_date
  from public.work_record w
  where w.employee_id = p_employee_id
    and w.work_date between p_start_date and p_end_date
    and (w.work_intime is not null or w.work_outtime is not null)
  order by w.work_date
  limit 1;

  if attendance_date is not null then
    raise exception '날짜(%)에 출근이력이 있습니다.', to_char(attendance_date, 'YYYY-MM-DD');
  end if;

  -- Lock every current conflict before taking the snapshot used for confirmation.
  perform a.id
  from public.work_assignments a
  where a.employee_id = p_employee_id
    and a.start_date <= p_end_date
    and a.end_date >= p_start_date
  order by a.start_date, a.id
  for update;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', a.id, 'startDate', a.start_date, 'endDate', a.end_date)
      order by a.start_date, a.id
    ),
    '[]'::jsonb
  ) into actual_conflicts
  from public.work_assignments a
  where a.employee_id = p_employee_id
    and a.start_date <= p_end_date
    and a.end_date >= p_start_date;

  if p_expected_conflicts is null then
    if jsonb_array_length(actual_conflicts) > 0 then
      raise exception '해당 직원의 근무기간이 기존 배정과 겹칩니다.';
    end if;
  else
    if jsonb_typeof(p_expected_conflicts) is distinct from 'array' then
      raise exception '기존 배정 확인 정보가 올바르지 않습니다.';
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object('id', expected.id, 'startDate', expected."startDate", 'endDate', expected."endDate")
        order by expected."startDate", expected.id
      ),
      '[]'::jsonb
    ) into expected_conflicts
    from jsonb_to_recordset(p_expected_conflicts) as expected(
      id uuid,
      "startDate" date,
      "endDate" date
    );

    if expected_conflicts is distinct from actual_conflicts then
      raise exception '기존 배정 정보가 변경되었습니다. 최신 자료를 확인한 후 다시 등록하세요.';
    end if;
  end if;

  -- Preserve historical work records without punches. Check every conflict before writing.
  for old_assignment in
    select a.*
    from public.work_assignments a
    where a.employee_id = p_employee_id
      and a.start_date <= p_end_date
      and a.end_date >= p_start_date
    order by a.start_date, a.id
    for update
  loop
    overlap_start := greatest(old_assignment.start_date, p_start_date);
    overlap_end := least(old_assignment.end_date, p_end_date);

    select min(w.work_date) into retained_history_date
    from public.work_record w
    where w.employee_id = p_employee_id
      and w.work_date < today
      and w.work_date between overlap_start and overlap_end;

    if retained_history_date is not null then
      raise exception '과거 근무기록은 보존 대상이어서 자동 조정할 수 없습니다.';
    end if;
  end loop;

  for old_assignment in
    select a.*
    from public.work_assignments a
    where a.employee_id = p_employee_id
      and a.start_date <= p_end_date
      and a.end_date >= p_start_date
    order by a.start_date, a.id
    for update
  loop
    original_start_date := old_assignment.start_date;
    original_end_date := old_assignment.end_date;
    overlap_start := greatest(original_start_date, p_start_date);
    overlap_end := least(original_end_date, p_end_date);
    new_periods := '[]'::jsonb;

    delete from public.work_record w
    where w.employee_id = p_employee_id
      and w.work_date between overlap_start and overlap_end;

    if original_start_date < overlap_start and original_end_date > overlap_end then
      update public.work_assignments
      set end_date = overlap_start - 1
      where id = old_assignment.id;

      insert into public.work_assignments (
        employee_id, worksite_id, start_date, end_date, work_style, has_weekend,
        in_time, out_time, schedule_rules_enabled
      ) values (
        old_assignment.employee_id, old_assignment.worksite_id, overlap_end + 1,
        original_end_date, old_assignment.work_style, old_assignment.has_weekend,
        old_assignment.in_time, old_assignment.out_time, old_assignment.schedule_rules_enabled
      ) returning id into tail_assignment_id;

      insert into public.assignment_schedule_rules (
        work_assignment_id, day_type, is_working_day, in_time, out_time
      )
      select tail_assignment_id, r.day_type, r.is_working_day, r.in_time, r.out_time
      from public.assignment_schedule_rules r
      where r.work_assignment_id = old_assignment.id;

      new_periods := jsonb_build_array(
        jsonb_build_object('startDate', original_start_date, 'endDate', overlap_start - 1),
        jsonb_build_object('startDate', overlap_end + 1, 'endDate', original_end_date)
      );
    elsif original_start_date < overlap_start then
      update public.work_assignments
      set end_date = overlap_start - 1
      where id = old_assignment.id;

      new_periods := jsonb_build_array(
        jsonb_build_object('startDate', original_start_date, 'endDate', overlap_start - 1)
      );
    elsif original_end_date > overlap_end then
      update public.work_assignments
      set start_date = overlap_end + 1
      where id = old_assignment.id;

      new_periods := jsonb_build_array(
        jsonb_build_object('startDate', overlap_end + 1, 'endDate', original_end_date)
      );
    else
      delete from public.work_assignments where id = old_assignment.id;
    end if;

    adjustments := adjustments || jsonb_build_array(jsonb_build_object(
      'oldStartDate', original_start_date,
      'oldEndDate', original_end_date,
      'newPeriods', new_periods
    ));
  end loop;

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

  return query select to_jsonb(new_assignment), adjustments;
end;
$$;

revoke all on function public.resolve_assignment_overlaps_transactionally(
  uuid, uuid, date, date, text, boolean, time, integer, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.resolve_assignment_overlaps_transactionally(
  uuid, uuid, date, date, text, boolean, time, integer, jsonb, jsonb
) to service_role;

notify pgrst, 'reload schema';

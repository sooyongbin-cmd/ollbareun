-- Runs in a disposable PostgreSQL database with the application schema. Always rolls back its fixtures.
begin;
do $$
declare
  v_employee_id uuid;
  worksite_id uuid;
  original_id uuid;
  new_id uuid;
  tail_id uuid;
  first_monday date;
  overlap_date date;
  expected_error text;
  caught_error text;
  actual_time text;
  rules jsonb := '[
    {"day_type":"weekday","is_working_day":true,"in_time":"09:00","out_time":1080},
    {"day_type":"saturday","is_working_day":false},
    {"day_type":"sunday","is_working_day":false},
    {"day_type":"holiday","is_working_day":false}
  ]'::jsonb;
begin
  insert into public.worksites(name, gps_info)
  values ('assignment-overlap-test', '{"latitude":37.5,"longitude":127.0}')
  returning id into worksite_id;
  v_employee_id := (public.save_employee_with_schedule(
    '{"name":"assignment-overlap-test","phone":"01000009876","phone_normalized":"01000009876","work_style":"0","in_time":"08:00","out_time":1080}',
    rules
  )->>'id')::uuid;

  first_monday := (now() at time zone 'Asia/Seoul')::date
    + ((8 - extract(isodow from (now() at time zone 'Asia/Seoul')::date)::integer) % 7) + 14;
  while exists (
    select 1 from public.public_holidays h
    where h.selected = 'Y' and h.holiday_date between first_monday and first_monday + 130
  ) loop
    first_monday := first_monday + 7;
  end loop;

  -- A middle replacement keeps both old residual segments and clones rules and days off.
  select id into original_id from public.create_assignment_with_schedule_rules(
    v_employee_id, worksite_id, first_monday, first_monday + 20, '0', false, '08:00', 1080, rules
  );
  insert into public.work_assignment_days_off(work_assignment_id, day_off_date, schedule_generated)
  values (original_id, first_monday + 16, true);
  update public.work_record w set intime = (w.work_date + time '07:00') at time zone 'Asia/Seoul'
  where w.employee_id = v_employee_id and w.work_date = first_monday + 7;

  begin
    perform public.resolve_assignment_overlap_transactionally(
      v_employee_id, worksite_id, first_monday + 7, first_monday + 13,
      '0', false, '09:00', 1080, rules, gen_random_uuid(), first_monday, first_monday + 20
    );
    raise exception 'stale assignment confirmation was accepted';
  exception when others then
    get stacked diagnostics caught_error = message_text;
    if caught_error <> '해당 직원의 근무기간이 기존 배정과 겹칩니다.' then raise; end if;
  end;
  if (select a.end_date from public.work_assignments a where a.id = original_id) <> first_monday + 20
    or not exists (select 1 from public.work_record w
      where w.employee_id = v_employee_id and w.work_date = first_monday + 7) then
    raise exception 'stale confirmation changed the existing assignment or record';
  end if;

  select id into new_id from public.resolve_assignment_overlap_transactionally(
    v_employee_id, worksite_id, first_monday + 7, first_monday + 13,
    '0', false, '09:00', 1080, rules, original_id, first_monday, first_monday + 20
  );
  if (select a.start_date from public.work_assignments a where a.id = new_id) <> first_monday + 7
    or (select a.end_date from public.work_assignments a where a.id = new_id) <> first_monday + 13 then
    raise exception 'new assignment period does not match the requested period';
  end if;
  select a.id into tail_id from public.work_assignments a
  where a.employee_id = v_employee_id and a.start_date = first_monday + 14;
  if (select end_date from public.work_assignments where id = original_id) <> first_monday + 6 then
    raise exception 'leading residual period was not preserved';
  end if;
  if (select end_date from public.work_assignments where id = tail_id) <> first_monday + 20 then
    raise exception 'trailing residual period was not preserved';
  end if;
  if (select count(*) from public.assignment_schedule_rules where work_assignment_id = tail_id) <> 4 then
    raise exception 'trailing residual schedule rules were not copied';
  end if;
  if not exists (select 1 from public.work_assignment_days_off
      where work_assignment_id = tail_id and day_off_date = first_monday + 16 and schedule_generated) then
    raise exception 'trailing residual day off was not moved';
  end if;
  select to_char(w.intime at time zone 'Asia/Seoul', 'HH24:MI') into actual_time
  from public.work_record w
  where w.employee_id = v_employee_id and w.work_date = first_monday + 7;
  if actual_time is distinct from '09:00' then
    raise exception 'overlapping future attendance was not regenerated';
  end if;

  -- Cover only the beginning of an old period: its tail starts the day after the new period.
  select id into original_id from public.create_assignment_with_schedule_rules(
    v_employee_id, worksite_id, first_monday + 40, first_monday + 50, '0', false, '08:00', 1080, rules
  );
  perform public.resolve_assignment_overlap_transactionally(
    v_employee_id, worksite_id, first_monday + 35, first_monday + 44,
    '0', false, '09:00', 1080, rules, original_id, first_monday + 40, first_monday + 50
  );
  if (select start_date from public.work_assignments where id = original_id) <> first_monday + 45 then
    raise exception 'tail-only residual period was not preserved';
  end if;

  -- Cover only the end of an old period: its head ends the day before the new period.
  select id into original_id from public.create_assignment_with_schedule_rules(
    v_employee_id, worksite_id, first_monday + 60, first_monday + 70, '0', false, '08:00', 1080, rules
  );
  perform public.resolve_assignment_overlap_transactionally(
    v_employee_id, worksite_id, first_monday + 66, first_monday + 75,
    '0', false, '09:00', 1080, rules, original_id, first_monday + 60, first_monday + 70
  );
  if (select end_date from public.work_assignments where id = original_id) <> first_monday + 65 then
    raise exception 'head-only residual period was not preserved';
  end if;

  -- Fully covered old periods are removed after their future records are checked.
  select id into original_id from public.create_assignment_with_schedule_rules(
    v_employee_id, worksite_id, first_monday + 80, first_monday + 85, '0', false, '08:00', 1080, rules
  );
  perform public.resolve_assignment_overlap_transactionally(
    v_employee_id, worksite_id, first_monday + 78, first_monday + 88,
    '0', false, '09:00', 1080, rules, original_id, first_monday + 80, first_monday + 85
  );
  if exists (select 1 from public.work_assignments where id = original_id) then
    raise exception 'fully replaced assignment remains';
  end if;

  -- A punch blocks the whole transaction and reports the earliest work date.
  overlap_date := first_monday + 101;
  select id into original_id from public.create_assignment_with_schedule_rules(
    v_employee_id, worksite_id, first_monday + 100, first_monday + 105, '0', false, '08:00', 1080, rules
  );
  update public.work_record w set work_intime = w.intime + interval '5 minutes'
  where w.employee_id = v_employee_id and w.work_date = overlap_date;
  expected_error := format('근무자 (%s)의 날짜 (%s)에 출퇴근 이력이 있습니다. 작업을 취소합니다.',
    'assignment-overlap-test', to_char(overlap_date, 'YYYY-MM-DD'));
  begin
    perform public.resolve_assignment_overlap_transactionally(
      v_employee_id, worksite_id, first_monday + 100, first_monday + 110,
      '0', false, '09:00', 1080, rules, original_id, first_monday + 100, first_monday + 105
    );
    raise exception 'attendance overlap was accepted';
  exception when others then
    get stacked diagnostics caught_error = message_text;
    if caught_error <> expected_error then raise; end if;
  end;
  if (select end_date from public.work_assignments where id = original_id) <> first_monday + 105 then
    raise exception 'attendance error changed the original assignment';
  end if;

  -- Past unclocked work records are also retained and block replacement.
  select id into original_id from public.create_assignment_with_schedule_rules(
    v_employee_id, worksite_id, (now() at time zone 'Asia/Seoul')::date - 20,
    (now() at time zone 'Asia/Seoul')::date - 15, '0', false, '08:00', 1080, rules
  );
  begin
    perform public.resolve_assignment_overlap_transactionally(
      v_employee_id, worksite_id, (now() at time zone 'Asia/Seoul')::date - 18,
      (now() at time zone 'Asia/Seoul')::date - 10, '0', false, '09:00', 1080, rules,
      original_id, (now() at time zone 'Asia/Seoul')::date - 20,
      (now() at time zone 'Asia/Seoul')::date - 15
    );
    raise exception 'historical unclocked record overlap was accepted';
  exception when others then
    get stacked diagnostics caught_error = message_text;
    if caught_error <> '과거 근무기록은 보존 대상이어서 자동 조정할 수 없습니다.' then raise; end if;
  end;
  if (select a.end_date from public.work_assignments a where a.id = original_id)
      <> (now() at time zone 'Asia/Seoul')::date - 15 then
    raise exception 'historic retention error changed the existing assignment';
  end if;

  -- Failure during new schedule creation restores the old interval and records.
  select id into original_id from public.create_assignment_with_schedule_rules(
    v_employee_id, worksite_id, first_monday + 120, first_monday + 125, '0', false, '08:00', 1080, rules
  );
  begin
    perform public.resolve_assignment_overlap_transactionally(
      v_employee_id, worksite_id, first_monday + 123, first_monday + 130,
      '0', false, '09:00', 1080,
      '[{"day_type":"weekday","is_working_day":true,"in_time":"09:00","out_time":1500}]',
      original_id, first_monday + 120, first_monday + 125
    );
    raise exception 'invalid schedule was accepted';
  exception when others then
    get stacked diagnostics caught_error = message_text;
    if caught_error <> '일반근무 퇴근시간은 24시 이전으로 입력하세요.' then raise; end if;
  end;
  if (select a.end_date from public.work_assignments a where a.id = original_id) <> first_monday + 125
    or not exists (select 1 from public.work_record w where w.employee_id = v_employee_id and w.work_date = first_monday + 123) then
    raise exception 'failed replacement was not rolled back';
  end if;
end;
$$;
rollback;

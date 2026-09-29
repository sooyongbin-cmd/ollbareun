-- Integration checks run entirely in a transaction; no test records are retained.
begin;
do $$
declare
  v_employee uuid := gen_random_uuid();
  v_site uuid;
  v_daily uuid := gen_random_uuid();
  v_month uuid := gen_random_uuid();
  v_quarter uuid := gen_random_uuid();
  v_half uuid := gen_random_uuid();
  v_ids uuid[];
  v_today date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
  v_saved public.work_record;
  v_done public.education_completions;
  v_timestamp timestamptz;
  v_count integer;
  v_failed boolean := false;
begin
  select id into strict v_site from public.worksites limit 1;
  insert into public.employees(id,name,phone,phone_normalized) values(v_employee,'education-transaction-test',v_employee::text,v_employee::text);
  v_ids := array[v_daily,v_month,v_quarter,v_half];
  insert into public.education_resources(id,title,youtube_link,education_type,created_at) values
    (v_daily,'test daily','https://youtu.be/test','daily','2000-01-01'),
    (v_month,'test monthly','https://youtu.be/test','monthly','2000-01-01'),
    (v_quarter,'test quarterly','https://youtu.be/test','quarterly','2000-01-01'),
    (v_half,'test semiannual','https://youtu.be/test','semiannual','2000-01-01');

  perform public.ensure_attendance_education(v_employee,'2026-05-27');
  perform public.ensure_attendance_education(v_employee,'2026-05-27');
  select count(*) into v_count from public.education_completions where employee_id=v_employee and resource_id=any(v_ids);
  assert v_count=4, 'same-day creation must be idempotent';
  perform public.ensure_attendance_education(v_employee,'2026-05-28');
  select count(*) into v_count from public.education_completions where employee_id=v_employee and resource_id=any(v_ids);
  assert v_count=8, 'pending monthly/quarterly/semiannual must repeat each attendance day';
  update public.education_completions set is_completed=true,completed_at='2026-05-28T10:00:00+09:00'
    where employee_id=v_employee and resource_id=any(v_ids) and education_date='2026-05-28';
  perform public.ensure_attendance_education(v_employee,'2026-05-29');
  select count(*) into v_count from public.education_completions where employee_id=v_employee and resource_id=any(v_ids) and education_date='2026-05-29';
  assert v_count=1, 'only daily is due after all period courses are complete';
  perform public.ensure_attendance_education(v_employee,'2026-05-26');
  select count(*) into v_count from public.education_completions where employee_id=v_employee and resource_id=any(v_ids) and education_date='2026-05-26';
  assert v_count=4, 'future completion must not hide backdated pending education';
  perform public.ensure_attendance_education(v_employee,'2026-06-01');
  select count(*) into v_count from public.education_completions where employee_id=v_employee and resource_id=any(v_ids) and education_date='2026-06-01';
  assert v_count=2, 'month boundary renews daily/monthly only';
  perform public.ensure_attendance_education(v_employee,'2026-07-01');
  select count(*) into v_count from public.education_completions where employee_id=v_employee and resource_id=any(v_ids) and education_date='2026-07-01';
  assert v_count=4, 'quarter and half-year boundary renew every category';
  assert public.education_period_start('quarterly','2026-10-01')='2026-10-01';
  assert public.education_period_start('semiannual','2027-01-01')='2027-01-01';

  perform public.ensure_attendance_education(v_employee,v_today-1);
  select * into v_done from public.complete_education(v_employee,v_daily);
  assert v_done.education_date=v_today and v_done.is_completed, 'completion must belong to actual KST day';
  v_timestamp := v_done.completed_at;
  perform public.complete_education(v_employee,v_daily);
  select completed_at into v_timestamp from public.education_completions where id=v_done.id;
  assert v_timestamp=v_done.completed_at, 'retry must preserve original completion timestamp';
  assert exists(select 1 from public.education_completions where employee_id=v_employee and resource_id=v_daily and education_date=v_today-1 and not is_completed), 'yesterday pending must remain pending';
  perform public.ensure_attendance_education(v_employee,v_today);
  assert (select is_completed from public.education_completions where id=v_done.id), 'attendance must not reset completion';
  update public.education_resources set education_type='monthly' where id=v_daily;
  assert (select education_type from public.education_completions where id=v_done.id)='daily', 'existing category snapshot must survive edits';
  assert (select education_type from public.current_education_status(v_employee) where resource_id=v_daily)='daily';

  -- Reporting uses transaction-start now(); seed an already-committed-time completion for this same-transaction test.
  update public.education_completions set completed_at=(v_today::timestamp at time zone 'Asia/Seoul') where id=v_done.id;
  assert (select completed_count from public.education_resource_completion_counts() where resource_id=v_daily)=1, 'resource count must respect today snapshot';

  -- Both insertion (guard) and updating an existing planned record (manager).
  select * into v_saved from public.save_attendance_with_education(null,jsonb_build_object('employee_id',v_employee,'worksite_id',v_site,'work_intime','2028-02-01T09:00:00+09:00'),true);
  assert exists(select 1 from public.education_completions where employee_id=v_employee and education_date='2028-02-01'), 'guard attendance must create education';
  perform public.save_attendance_with_education(v_saved.id,jsonb_build_object('work_intime','2028-02-01T09:00:00+09:00'),false);
  select count(*) into v_count from public.education_completions where employee_id=v_employee and resource_id=any(v_ids) and education_date='2028-02-01';
  assert v_count=4, 'manager resave must not duplicate';
  insert into public.work_record(employee_id,worksite_id,work_date,intime,outtime) values(v_employee,v_site,'2028-02-02','2028-02-02T09:00:00+09:00','2028-02-02T18:00:00+09:00') returning * into v_saved;
  select * into v_saved from public.save_attendance_with_education(v_saved.id,jsonb_build_object('work_intime','2028-02-02T09:01:00+09:00','work_outtime','2028-02-02T17:00:00+09:00'),false);
  assert v_saved.intime_status='1' and v_saved.outtime_status='1', 'late and early departure codes must be preserved';
  assert exists(select 1 from public.education_completions where employee_id=v_employee and education_date='2028-02-02'), 'manager attendance must create education';
  perform public.save_attendance_with_education(v_saved.id,jsonb_build_object('work_intime','2028-02-02T09:00:00+09:00'),false);
  assert (select work_outtime from public.work_record where id=v_saved.id)='2028-02-02T17:00:00+09:00', 'omitted clock-out must not be cleared';

  -- Inject a failure for this fixture only; rollback also removes this constraint.
  execute format('alter table public.education_completions add constraint education_test_reject check (employee_id <> %L::uuid) not valid',v_employee);
  begin
    perform public.save_attendance_with_education(null,jsonb_build_object('employee_id',v_employee,'worksite_id',v_site,'work_intime','2028-02-03T09:00:00+09:00'),true);
  exception when check_violation then v_failed := true;
  end;
  assert v_failed, 'injected education failure must propagate';
  assert not exists(select 1 from public.work_record where employee_id=v_employee and work_date='2028-02-03'), 'attendance must rollback on education failure';
  assert not has_function_privilege('anon','public.complete_education(uuid,uuid)','execute'), 'anonymous callers must not write completion';
  assert not has_function_privilege('authenticated','public.save_attendance_with_education(uuid,jsonb,boolean)','execute'), 'attendance RPC must be server-only';
end $$;
rollback;
select 'education integration checks passed; all test writes rolled back' as result;

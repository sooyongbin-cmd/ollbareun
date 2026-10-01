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
  v_resource uuid;
  v_today date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
  v_saved public.work_record;
  v_done public.education_completions;
  v_timestamp timestamptz;
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

  assert to_regprocedure('public.ensure_attendance_education(uuid,date)') is null, 'attendance generator must be removed';
  assert (select count(*) from public.current_education_status(v_employee) where resource_id=any(v_ids) and not is_completed)=4, 'missing rows must still appear as pending to the guard';
  assert not exists(select 1 from public.education_completions where employee_id=v_employee), 'reading pending status must not create records';

  -- A failure in education writes cannot block attendance anymore.
  execute format('alter table public.education_completions add constraint education_test_reject check (employee_id <> %L::uuid) not valid',v_employee);
  select * into v_saved from public.save_attendance(null,jsonb_build_object('employee_id',v_employee,'worksite_id',v_site,'work_intime','2028-02-01T09:00:00+09:00'),true);
  assert v_saved.work_date='2028-02-01' and v_saved.intime_status='2', 'guard attendance must succeed independently';
  begin
    perform public.save_attendance(v_saved.id,jsonb_build_object('work_intime','2028-02-01T09:01:00+09:00'),true);
  exception when raise_exception then v_failed := true;
  end;
  assert v_failed, 'duplicate guard clock-in must still be rejected';

  insert into public.work_record(employee_id,worksite_id,work_date,intime,outtime)
    values(v_employee,v_site,'2028-02-02','2028-02-02T22:00:00+09:00','2028-02-03T06:00:00+09:00') returning * into v_saved;
  select * into v_saved from public.save_attendance(v_saved.id,jsonb_build_object('work_intime','2028-02-03T00:01:00+09:00','work_outtime','2028-02-03T05:00:00+09:00'),false);
  assert v_saved.work_date='2028-02-02', 'manager must preserve scheduled date for overnight attendance';
  assert v_saved.intime_status='1' and v_saved.outtime_status='1', 'late and early departure codes must be preserved';
  perform public.save_attendance(v_saved.id,jsonb_build_object('work_intime','2028-02-03T00:02:00+09:00'),false);
  assert (select work_outtime from public.work_record where id=v_saved.id)='2028-02-03T05:00:00+09:00', 'omitted clock-out must not be cleared';
  -- Old application versions must also stop creating records immediately.
  perform public.save_attendance_with_education(v_saved.id,jsonb_build_object('work_intime','2028-02-03T00:03:00+09:00'),false);
  perform public.save_attendance_with_education(null,jsonb_build_object('employee_id',v_employee,'worksite_id',v_site,'work_intime','2028-02-04T09:00:00+09:00'),true);
  assert not exists(select 1 from public.education_completions where employee_id=v_employee), 'neither attendance entry point may create education rows';
  alter table public.education_completions drop constraint education_test_reject;

  -- Actual completion creates exactly one row per resource and KST day.
  foreach v_resource in array v_ids loop
    select * into v_done from public.complete_education(v_employee,v_resource);
    assert v_done.education_date=v_today and v_done.is_completed, 'completion must belong to actual KST day';
    perform public.complete_education(v_employee,v_resource);
    select completed_at into v_timestamp from public.education_completions where id=v_done.id;
    assert v_timestamp=v_done.completed_at, 'retry must preserve original completion timestamp';
  end loop;
  assert (select count(*) from public.education_completions where employee_id=v_employee)=4, 'only completed resources are persisted';
  assert not exists(select 1 from public.education_completions where employee_id=v_employee and not is_completed), 'no pending rows are generated';
  -- Reporting uses transaction-start now(), so use a time visible within this transaction.
  update public.education_completions set completed_at=(v_today::timestamp at time zone 'Asia/Seoul') where employee_id=v_employee;
  assert (select count(*) from public.current_education_status(v_employee) where resource_id=any(v_ids) and is_completed)=4;
  assert (select completed_count from public.education_resource_completion_counts() where resource_id=v_daily)=1;
  perform public.save_attendance(v_saved.id,jsonb_build_object('work_intime','2028-02-03T00:04:00+09:00'),false);
  assert (select count(*) from public.education_completions where employee_id=v_employee)=4, 'attendance must preserve existing completions';

  assert public.education_period_start('daily','2026-09-30')='2026-09-30';
  assert public.education_period_start('monthly','2026-09-30')='2026-09-01';
  assert public.education_period_start('quarterly','2026-10-01')='2026-10-01';
  assert public.education_period_start('semiannual','2027-01-01')='2027-01-01';
  update public.education_resources set education_type='monthly' where id=v_daily;
  assert (select education_type from public.education_completions where employee_id=v_employee and resource_id=v_daily)='daily', 'existing category snapshot must survive edits';
  assert (select education_type from public.current_education_status(v_employee) where resource_id=v_daily)='daily';
  assert not has_function_privilege('anon','public.complete_education(uuid,uuid)','execute');
  assert not has_function_privilege('anon','public.save_attendance(uuid,jsonb,boolean)','execute');
  assert not has_function_privilege('authenticated','public.save_attendance(uuid,jsonb,boolean)','execute');
  assert not has_function_privilege('authenticated','public.save_attendance_with_education(uuid,jsonb,boolean)','execute');
  assert has_function_privilege('service_role','public.save_attendance(uuid,jsonb,boolean)','execute');
end $$;
rollback;
select 'education integration checks passed; all test writes rolled back' as result;

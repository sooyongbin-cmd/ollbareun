-- Exercise eligibility and both registration paths without persisting fixtures or sending pushes.
begin;
create temporary table reminder_registration_fixture as
select id, employee_id, work_date, work_intime from public.work_record
order by (work_date = (now() at time zone 'Asia/Seoul')::date) desc limit 1;
create trigger reminder_registration_insert after insert on reminder_registration_fixture
for each row execute function public.schedule_education_reminder_job();
create trigger reminder_registration_update after update on reminder_registration_fixture
for each row execute function public.schedule_education_reminder_job();

do $$
declare
  fixture record;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_day date := '2098-01-10';
  v_clock timestamptz := '2098-01-10 08:00:00+09';
  v_title text := 'reminder-test-' || gen_random_uuid()::text;
  v_result record;
  v_due timestamptz;
begin
  select * into fixture from reminder_registration_fixture;
  if fixture.id is null then raise exception 'A work record fixture is required'; end if;
  truncate reminder_registration_fixture;
  delete from public.education_reminder_jobs where work_record_id = fixture.id;
  insert into public.system_configs(system_code, content) values ('S000001', '7')
  on conflict (system_code) do update set content = excluded.content;

  -- No resources means no reminder, even after clock-in.
  insert into reminder_registration_fixture values (fixture.id, fixture.employee_id, '2097-01-10', v_clock);
  if exists(select 1 from public.education_reminder_jobs where work_record_id = fixture.id) then
    raise exception 'No education should not create a job';
  end if;
  truncate reminder_registration_fixture;

  insert into public.education_resources(title, youtube_link, education_type, startdate, enddate)
  select v_title || suffix, 'https://www.youtube.com/watch?v=abcdefghijk', kind, start_day, end_day from (values
    ('d1', '일일', v_day, v_day + 1), ('d2', '일일', v_day - 1, v_day),
    ('m', '월간', v_day, v_day), ('q', '분기', v_day, v_day),
    ('h', '반기', v_day, v_day), ('o', '기타', v_day, v_day),
    ('expired', '일일', v_day - 2, v_day - 1), ('future', '일일', v_day + 1, v_day + 2)
  ) as resources(suffix, kind, start_day, end_day);
  if public.missing_education_count(fixture.employee_id, v_day) <> 6 then
    raise exception 'Date boundaries or education types were counted incorrectly';
  end if;

  -- Daily history on another date and non-daily history in another month do not count.
  insert into public.education_completions(employee_id, title, education_type, work_date)
  values (fixture.employee_id, v_title || 'd1', '일일', v_day - 1),
    (fixture.employee_id, v_title || 'q', '분기', '2097-12-31'),
    (fixture.employee_id, v_title || 'h', '반기', '2097-12-31'),
    (fixture.employee_id, v_title || 'o', '기타', '2097-12-31');
  if public.missing_education_count(fixture.employee_id, v_day) <> 6 then
    raise exception 'Out-of-range completion history should not count';
  end if;
  -- Existence is sufficient, including null completed_at; duplicates do not inflate completion.
  insert into public.education_completions(employee_id, title, education_type, work_date)
  values (fixture.employee_id, v_title || 'd1', '일일', v_day),
    (fixture.employee_id, v_title || 'd1', '일일', v_day),
    (fixture.employee_id, v_title || 'm', '월간', '2098-01-01');
  if public.missing_education_count(fixture.employee_id, v_day) <> 4 then
    raise exception 'Completion existence or month matching failed';
  end if;
  insert into reminder_registration_fixture values (fixture.id, fixture.employee_id, v_day, v_clock);
  select due_at into v_due from public.education_reminder_jobs where work_record_id = fixture.id and status = 'pending';
  if v_due is distinct from v_clock + interval '7 minutes' then
    raise exception 'Clock-in did not schedule missing education with the configured delay';
  end if;
  update reminder_registration_fixture set work_intime = work_intime;
  if v_due is distinct from (select due_at from public.education_reminder_jobs where work_record_id = fixture.id) then
    raise exception 'Unchanged clock-in rescheduled the job';
  end if;

  insert into public.education_completions(employee_id, title, education_type, work_date)
  select fixture.employee_id, title, education_type, v_day from public.education_resources
  where title like v_title || '%' and startdate <= v_day and enddate >= v_day;
  update reminder_registration_fixture set work_intime = v_clock + interval '1 minute';
  if (select status from public.education_reminder_jobs where work_record_id = fixture.id) <> 'cancelled' then
    raise exception 'Fully completed changed attendance did not cancel the pending job';
  end if;
  delete from public.education_reminder_jobs where work_record_id = fixture.id;
  truncate reminder_registration_fixture;
  insert into reminder_registration_fixture values (fixture.id, fixture.employee_id, v_day, v_clock);
  if exists(select 1 from public.education_reminder_jobs where work_record_id = fixture.id) then
    raise exception 'Fully completed employee received a clock-in job';
  end if;

  -- Put the fixture employee in today's daily list, preserving everything via rollback.
  update public.work_record set work_intime = now(), work_outtime = null, outtime = now()
  where id = fixture.id;
  delete from public.education_reminder_jobs where work_record_id = fixture.id;
  insert into public.education_completions(employee_id, title, education_type, work_date)
  select fixture.employee_id, title, education_type, v_today from public.education_resources
  where startdate <= v_today and enddate >= v_today;
  insert into public.education_resources(title, youtube_link, education_type, startdate, enddate)
  values (v_title || 'manual', 'https://www.youtube.com/watch?v=abcdefghijk', '일일', v_today, v_today);
  select * into v_result from public.register_daily_education_reminders(v_today, array[fixture.employee_id, fixture.employee_id]);
  if v_result.registered_count <> 1 or v_result.delay_minutes <> 7 then
    raise exception 'Manual registration count or delay failed';
  end if;
  if not exists(select 1 from public.education_reminder_jobs where work_record_id = fixture.id
    and status = 'pending' and work_date = v_today and due_at = now() + interval '7 minutes') then
    raise exception 'Manual registration did not start its delay at registration time';
  end if;
  select * into v_result from public.register_daily_education_reminders(v_today, '{}'::uuid[]);
  if v_result.registered_count <> 0 then raise exception 'Empty list registered employees'; end if;
  update public.education_reminder_jobs set status = 'processing' where work_record_id = fixture.id;
  select * into v_result from public.register_daily_education_reminders(v_today, array[fixture.employee_id]);
  if v_result.registered_count <> 0 then raise exception 'Processing job was reset'; end if;
  delete from public.education_reminder_jobs where work_record_id = fixture.id;
  insert into public.education_completions(employee_id, title, education_type, work_date)
  values (fixture.employee_id, v_title || 'manual', '일일', v_today);
  select * into v_result from public.register_daily_education_reminders(v_today, array[fixture.employee_id]);
  if v_result.registered_count <> 0 then raise exception 'Completed employee registered manually'; end if;
  begin
    perform public.register_daily_education_reminders(v_today - 1, array[fixture.employee_id]);
    raise exception 'Past work date should be rejected';
  exception when raise_exception then
    if sqlerrm <> '근무일을 오늘로 조회한 후 교육알림 처리해주세요.' then raise; end if;
  end;
  if has_function_privilege('anon', 'public.register_daily_education_reminders(date,uuid[])', 'execute')
    or has_function_privilege('authenticated', 'public.register_daily_education_reminders(date,uuid[])', 'execute') then
    raise exception 'Registration RPC must only be available to the server';
  end if;
end;
$$;
rollback;

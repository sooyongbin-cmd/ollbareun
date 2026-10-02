-- Runs in a disposable PostgreSQL database with the application schema. Always rolls back its fixtures.
begin;
do $$
declare
  e uuid; a uuid; s uuid; result jsonb; original_in timestamptz; n integer;
begin
  insert into public.worksites(name,gps_info) values ('schedule-test','{"latitude":37.5,"longitude":127.0}') returning id into s;
  result := public.save_employee_with_schedule('{"name":"schedule-test","phone":"01000001234","phone_normalized":"01000001234","work_style":"0","in_time":"07:00","out_time":1080}',
    '[{"day_type":"saturday","is_working_day":true,"in_time":"08:00","out_time":1020},{"day_type":"sunday","is_working_day":false}]');
  e := (result->>'id')::uuid;
  select id into a from public.create_assignment_with_schedule_rules(e,s,'2030-01-04','2030-01-07');
  if (select to_char(intime at time zone 'Asia/Seoul','HH24:MI') from public.work_record where employee_id=e and work_date='2030-01-04') is distinct from '07:00' then raise exception 'weekday fallback failed'; end if;
  if (select to_char(intime at time zone 'Asia/Seoul','HH24:MI') from public.work_record where employee_id=e and work_date='2030-01-05') is distinct from '08:00' then raise exception 'Saturday override failed'; end if;
  if exists(select 1 from public.work_record where employee_id=e and work_date='2030-01-06') then raise exception 'Sunday off failed'; end if;
  -- Employee edits cannot change an assignment snapshot.
  perform public.save_employee_with_schedule(jsonb_build_object('id',e,'in_time','09:00'), '[]');
  perform public.generate_assignment_daily_attendance(a);
  if (select to_char(intime at time zone 'Asia/Seoul','HH24:MI') from public.work_record where employee_id=e and work_date='2030-01-05') is distinct from '08:00' then raise exception 'snapshot failed'; end if;
  -- Clocked records remain unchanged, even when the generator runs again.
  update public.work_record set work_intime=intime + interval '5 minutes', intime_status='1' where employee_id=e and work_date='2030-01-05';
  select intime into original_in from public.work_record where employee_id=e and work_date='2030-01-05';
  update public.work_assignments set in_time='10:00' where id=a;
  perform public.generate_assignment_daily_attendance(a);
  if (select intime from public.work_record where employee_id=e and work_date='2030-01-05') is distinct from original_in or
    (select intime_status from public.work_record where employee_id=e and work_date='2030-01-05') is distinct from '1' then raise exception 'clocked history changed'; end if;
  -- Public holidays win over Saturday rules; custom holidays remain days off.
  insert into public.public_holidays(holiday_date,name,holiday_type) values ('2030-02-02','test public','public'),('2030-02-04','test custom','custom');
  select id into a from public.create_assignment_with_schedule_rules(e,s,'2030-02-01','2030-02-04','0',false,'16:00',1380,
    '[{"day_type":"saturday","is_working_day":true,"in_time":"09:00","out_time":1080},{"day_type":"holiday","is_working_day":true,"in_time":"08:00","out_time":1080}]');
  if (select to_char(intime at time zone 'Asia/Seoul','HH24:MI') from public.work_record where employee_id=e and work_date='2030-02-02') is distinct from '08:00' then raise exception 'holiday precedence failed'; end if;
  if (select to_char(intime at time zone 'Asia/Seoul','HH24:MI') from public.work_record where employee_id=e and work_date='2030-02-01') is distinct from '16:00' then raise exception 'C weekday failed'; end if;
  if exists(select 1 from public.work_record where employee_id=e and work_date='2030-02-04') then raise exception 'custom holiday failed'; end if;
  -- Overnight and alternate-day schedules use elapsed minutes from the shift start date.
  select id into a from public.create_assignment_with_schedule_rules(e,s,'2030-03-01','2030-03-03','2',false,'22:00',1800,'[]');
  if (select outtime at time zone 'Asia/Seoul' from public.work_record where employee_id=e and work_date='2030-03-01') is distinct from '2030-03-02 06:00'::timestamp then raise exception 'overnight failed'; end if;
  select id into a from public.create_assignment_with_schedule_rules(e,s,'2030-04-01','2030-04-03','1',false,'06:00',1800,'[]');
  select count(*) into n from public.work_record where employee_id=e and work_date between '2030-04-01' and '2030-04-03';
  if n <> 2 then raise exception 'alternate cycle failed'; end if;
  -- A past unclocked record also keeps its originally scheduled time.
  select id into a from public.create_assignment_with_schedule_rules(e,s,'2020-01-02','2020-01-02','0',false,'07:00',1080,'[]');
  update public.work_assignments set in_time='11:00' where id=a;
  perform public.generate_assignment_daily_attendance(a);
  if (select to_char(intime at time zone 'Asia/Seoul','HH24:MI') from public.work_record where employee_id=e and work_date='2020-01-02') is distinct from '07:00' then raise exception 'past schedule changed'; end if;
  -- Invalid replacement must roll back employee edits as well as rules.
  begin
    perform public.save_employee_with_schedule(jsonb_build_object('id',e,'in_time','11:00'),
      '[{"day_type":"saturday","is_working_day":false},{"day_type":"saturday","is_working_day":false}]');
    raise exception 'duplicate rule accepted';
  exception when unique_violation then null; end;
  if (select in_time from public.employees where id=e) is distinct from '09:00'::time then raise exception 'atomic save failed'; end if;
  -- Legacy assignments still run the existing generator.
  insert into public.work_assignments(employee_id,worksite_id,start_date,end_date,work_style,has_weekend,in_time,out_time)
    values(e,s,'2030-05-01','2030-05-01','0',false,'07:00',1080) returning id into a;
  perform public.generate_assignment_daily_attendance(a);
  if not exists(select 1 from public.work_record where employee_id=e and work_date='2030-05-01') then raise exception 'legacy failed'; end if;
  if has_table_privilege('anon','public.employee_schedule_rules','SELECT') or has_function_privilege('authenticated','public.save_employee_with_schedule(jsonb,jsonb)','EXECUTE') then raise exception 'private access failed'; end if;
end;
$$;
rollback;

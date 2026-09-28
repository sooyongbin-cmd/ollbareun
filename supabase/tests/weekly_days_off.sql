-- Recurring weekly days off: user's A/B/C/D/E examples, including holiday collisions.
begin;
do $$
declare
  profile record; e uuid; s uuid; a uuid; employee jsonb; actual date[];
begin
  insert into public.worksites(name,gps_info) values ('weekly-days-off-test','{"latitude":37.5,"longitude":127.0}') returning id into s;
  insert into public.public_holidays(holiday_date,name,holiday_type) values
    ('2030-01-08','Tuesday test','public'),('2030-01-09','Wednesday test','public'),('2030-01-12','Saturday test','public');
  for profile in select * from (values
    ('A', '[{"day_type":"sunday","is_working_day":false},{"day_type":"holiday","is_working_day":false}]'::jsonb, array['2030-01-08','2030-01-09','2030-01-12','2030-01-13']::date[]),
    ('B', '[{"day_type":"saturday","is_working_day":false},{"day_type":"sunday","is_working_day":false}]'::jsonb, array['2030-01-12','2030-01-13']::date[]),
    ('C', '[{"day_type":"saturday","is_working_day":false},{"day_type":"sunday","is_working_day":false},{"day_type":"holiday","is_working_day":false}]'::jsonb, array['2030-01-08','2030-01-09','2030-01-12','2030-01-13']::date[]),
    ('D', '[{"day_type":"tuesday","is_working_day":false},{"day_type":"holiday","is_working_day":true,"in_time":"08:00","out_time":1080}]'::jsonb, array['2030-01-08']::date[]),
    ('E', '[{"day_type":"monday","is_working_day":false},{"day_type":"tuesday","is_working_day":false}]'::jsonb, array['2030-01-07','2030-01-08']::date[])
  ) as cases(label,rules,expected)
  loop
    employee := public.save_employee_with_schedule(jsonb_build_object('name','weekly-test-'||profile.label,'phone','weekly-test-'||profile.label,'phone_normalized','weekly-test-'||profile.label,'work_style','0','in_time','07:00','out_time',1080),profile.rules);
    e := (employee->>'id')::uuid;
    select id into a from public.create_assignment_with_schedule_rules(e,s,'2030-01-07','2030-01-13');
    select array_agg(day_off_date order by day_off_date) into actual from public.work_assignment_days_off where work_assignment_id=a;
    if actual is distinct from profile.expected then raise exception 'Profile %: expected %, got %',profile.label,profile.expected,actual; end if;
    if (select count(*) from public.work_record where employee_id=e) <> 7-cardinality(profile.expected) then raise exception 'Profile % has incorrect attendance count',profile.label; end if;
    if profile.label='D' and (select to_char(intime at time zone 'Asia/Seoul','HH24:MI') from public.work_record where employee_id=e and work_date='2030-01-09') is distinct from '08:00' then raise exception 'Working holiday hours failed'; end if;
    -- Editing the employee afterwards cannot alter this assignment's weekly days off.
    perform public.save_employee_with_schedule(jsonb_build_object('id',e),'[]');
    perform public.generate_assignment_daily_attendance(a);
    select array_agg(day_off_date order by day_off_date) into actual from public.work_assignment_days_off where work_assignment_id=a;
    if actual is distinct from profile.expected then raise exception 'Profile % snapshot changed',profile.label; end if;
  end loop;
  -- All nine keys are valid; a weekday-specific rule overrides the weekday group.
  employee := public.save_employee_with_schedule(jsonb_build_object('id',e),
    '[{"day_type":"weekday","is_working_day":false},{"day_type":"monday","is_working_day":true,"in_time":"09:00","out_time":1080},{"day_type":"tuesday","is_working_day":false},{"day_type":"wednesday","is_working_day":false},{"day_type":"thursday","is_working_day":false},{"day_type":"friday","is_working_day":false},{"day_type":"saturday","is_working_day":false},{"day_type":"sunday","is_working_day":false},{"day_type":"holiday","is_working_day":false}]');
  select id into a from public.create_assignment_with_schedule_rules(e,s,'2030-02-04','2030-02-10');
  if (select count(*) from public.work_record where employee_id=e and work_date between '2030-02-04' and '2030-02-10') <> 1 then raise exception 'Weekday override failed'; end if;
end;
$$;
rollback;

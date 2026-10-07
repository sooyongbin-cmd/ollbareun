-- Run against a database with at least one employee work record.
-- All fixture settings and queue writes roll back; no push is sent.
begin;
create temporary table reminder_attendance_fixture as
select id, employee_id, work_date, work_intime
from public.work_record where employee_id is not null limit 1;
create trigger reminder_fixture_insert after insert on reminder_attendance_fixture
for each row execute function public.schedule_education_reminder_job();
create trigger reminder_fixture_update after update on reminder_attendance_fixture
for each row execute function public.schedule_education_reminder_job();
do $$
declare
  fixture record;
  scenario record;
  clock_in timestamptz := '2030-01-01 00:00:00+00';
  actual_due timestamptz;
begin
  select * into fixture from reminder_attendance_fixture;
  if fixture.id is null then raise exception 'A work record fixture is required'; end if;
  truncate reminder_attendance_fixture;
  for scenario in select * from (values
    ('7', 7), ('45', 45), ('0', 0), (' 12 ', 12),
    ('-1', 30), ('1.5', 30), ('invalid', 30), ('2147483648', 30), (null, 30)
  ) as scenarios(content, minutes)
  loop
    delete from public.education_reminder_jobs where work_record_id = fixture.id;
    delete from public.system_configs where system_code = 'S000001';
    if scenario.content is not null then
      insert into public.system_configs(system_code, content) values ('S000001', scenario.content);
    end if;
    truncate reminder_attendance_fixture;
    insert into reminder_attendance_fixture values (fixture.id, fixture.employee_id, fixture.work_date, clock_in);
    select due_at into actual_due from public.education_reminder_jobs where work_record_id = fixture.id;
    if actual_due is distinct from clock_in + make_interval(mins => scenario.minutes) then
      raise exception 'Delay % expected % minutes, got %', scenario.content, scenario.minutes, actual_due;
    end if;
    -- Changing the setting alone does not move already scheduled reminders.
    update public.system_configs set content = '90' where system_code = 'S000001';
    update reminder_attendance_fixture set work_intime = work_intime;
    if actual_due is distinct from (select due_at from public.education_reminder_jobs where work_record_id = fixture.id) then
      raise exception 'Unchanged attendance rescheduled the reminder';
    end if;
    update reminder_attendance_fixture set work_intime = null;
    if (select status from public.education_reminder_jobs where work_record_id = fixture.id) <> 'cancelled' then
      raise exception 'Cancelled attendance left a pending reminder';
    end if;
  end loop;
end;
$$;
rollback;

-- Freeze inherited defaults before employees can switch to day-specific rules.
update public.work_assignments a set work_style = coalesce(a.work_style,e.work_style),
  has_weekend = coalesce(a.has_weekend,e.has_weekend), in_time = coalesce(a.in_time,e.in_time), out_time = coalesce(a.out_time,e.out_time)
from public.employees e where e.id=a.employee_id
  and (a.work_style is null or a.has_weekend is null or a.in_time is null or a.out_time is null);

-- Rules are private to manager APIs (service_role), like existing employee writes.
alter table public.employees add column schedule_rules_enabled boolean not null default false;
alter table public.work_assignments add column schedule_rules_enabled boolean not null default false;
alter table public.work_assignment_days_off add column schedule_generated boolean not null default false;
-- Preserve the interpretation of existing holiday rows. New manual entries specify custom.
alter table public.public_holidays add column holiday_type text not null default 'public'
  check (holiday_type in ('public', 'custom'));

create table public.employee_schedule_rules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  day_type text not null check (day_type in ('weekday', 'saturday', 'sunday', 'holiday')),
  is_working_day boolean not null,
  in_time time,
  out_time integer,
  unique (employee_id, day_type),
  check ((not is_working_day and in_time is null and out_time is null)
    or (is_working_day and in_time is not null and out_time is not null
      and out_time > extract(hour from in_time)::integer * 60 + extract(minute from in_time)::integer
      and out_time < 3000))
);
create table public.assignment_schedule_rules (
  id uuid primary key default gen_random_uuid(),
  work_assignment_id uuid not null references public.work_assignments(id) on delete cascade,
  day_type text not null check (day_type in ('weekday', 'saturday', 'sunday', 'holiday')),
  is_working_day boolean not null,
  in_time time,
  out_time integer,
  unique (work_assignment_id, day_type),
  check ((not is_working_day and in_time is null and out_time is null)
    or (is_working_day and in_time is not null and out_time is not null
      and out_time > extract(hour from in_time)::integer * 60 + extract(minute from in_time)::integer
      and out_time < 3000))
);
alter table public.employee_schedule_rules enable row level security;
alter table public.assignment_schedule_rules enable row level security;
revoke all on public.employee_schedule_rules, public.assignment_schedule_rules from anon, authenticated;
grant all on public.employee_schedule_rules, public.assignment_schedule_rules to service_role;
create policy employee_schedule_rules_service on public.employee_schedule_rules for all to service_role using (true) with check (true);
create policy assignment_schedule_rules_service on public.assignment_schedule_rules for all to service_role using (true) with check (true);

-- Save the employee and replace their rules in one transaction. Existing assignments are untouched.
create function public.save_employee_with_schedule(p_employee jsonb, p_rules jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  employee public.employees%rowtype;
  employee_id uuid := (p_employee->>'id')::uuid;
begin
  if jsonb_typeof(p_rules) is distinct from 'array' or jsonb_array_length(p_rules) > 4 then
    raise exception '요일별 근무 설정이 올바르지 않습니다.';
  end if;
  if employee_id is null then
    insert into public.employees (name, phone, phone_normalized, role, work_style, in_time, out_time,
      has_weekend, is_retired, retired_at, schedule_rules_enabled)
    values (p_employee->>'name', p_employee->>'phone', p_employee->>'phone_normalized',
      coalesce(p_employee->>'role', '경비원'), coalesce(p_employee->>'work_style', '0'),
      coalesce((p_employee->>'in_time')::time, '08:00'), coalesce((p_employee->>'out_time')::integer, 1080),
      false, false, null, true)
    on conflict (name, phone_normalized) do update set role = excluded.role, work_style = excluded.work_style,
      in_time = excluded.in_time, out_time = excluded.out_time, has_weekend = false,
      is_retired = false, retired_at = null, schedule_rules_enabled = true
    returning * into employee;
  else
    select * into strict employee from public.employees where id = employee_id for update;
    employee := jsonb_populate_record(employee, p_employee);
    update public.employees set name = employee.name, phone = employee.phone, phone_normalized = employee.phone_normalized,
      role = employee.role, work_style = employee.work_style, in_time = employee.in_time, out_time = employee.out_time,
      is_retired = employee.is_retired, retired_at = employee.retired_at, has_weekend = false, schedule_rules_enabled = true
    where id = employee_id returning * into employee;
  end if;
  if employee.work_style = '0' and exists (
    select 1 from jsonb_to_recordset(p_rules) as r(out_time integer) where r.out_time >= 1440
  ) then raise exception '일반근무 퇴근시간은 24시 이전으로 입력하세요.'; end if;
  delete from public.employee_schedule_rules where employee_schedule_rules.employee_id = employee.id;
  insert into public.employee_schedule_rules (employee_id, day_type, is_working_day, in_time, out_time)
    select employee.id, r.day_type, r.is_working_day, r.in_time, r.out_time
    from jsonb_to_recordset(p_rules) as r(day_type text, is_working_day boolean, in_time time, out_time integer);
  return to_jsonb(employee) || jsonb_build_object('schedule_rules', p_rules);
end;
$$;
revoke all on function public.save_employee_with_schedule(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.save_employee_with_schedule(jsonb,jsonb) to service_role;

-- Keep legacy assignments on their original generator; no existing attendance is regenerated by this migration.
alter function public.generate_assignment_daily_attendance(uuid) rename to generate_assignment_daily_attendance_legacy;
create function public.generate_assignment_daily_attendance(p_assignment_id uuid)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  assignment public.work_assignments%rowtype;
  calendar record;
  rule public.assignment_schedule_rules%rowtype;
  resolved_day_type text;
  working boolean;
  start_time time;
  end_minutes integer;
  generated integer := 0;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select * into strict assignment from public.work_assignments where id = p_assignment_id for update;
  if not assignment.schedule_rules_enabled then
    return public.generate_assignment_daily_attendance_legacy(p_assignment_id);
  end if;
  if assignment.work_style is null or assignment.in_time is null or assignment.out_time is null then
    raise exception '근무형태와 기본 출퇴근시간을 입력하세요.';
  end if;
  -- Never rewrite a historical or clocked record. Only future, unstarted schedules can be rebuilt.
  delete from public.work_record where employee_id = assignment.employee_id
    and worksite_id = assignment.worksite_id and work_date between greatest(today, assignment.start_date) and assignment.end_date
    and work_intime is null and work_outtime is null;
  delete from public.work_assignment_days_off d where d.work_assignment_id = assignment.id
    and d.schedule_generated and d.day_off_date >= today
    and not exists (select 1 from public.work_record w where w.employee_id = assignment.employee_id
      and w.work_date = d.day_off_date and (w.work_intime is not null or w.work_outtime is not null));
  for calendar in select assignment.start_date + n as work_day, n as offset_days
    from generate_series(0, assignment.end_date - assignment.start_date) as n
  loop
    -- Past existing records, including their original scheduled times, remain authoritative.
    if exists (select 1 from public.work_record w where w.employee_id = assignment.employee_id
      and w.work_date = calendar.work_day) then continue; end if;
    resolved_day_type := case
      when exists (select 1 from public.public_holidays h where h.holiday_date = calendar.work_day
        and h.selected = 'Y' and h.holiday_type = 'public') then 'holiday'
      when extract(isodow from calendar.work_day) = 6 then 'saturday'
      when extract(isodow from calendar.work_day) = 7 then 'sunday'
      else 'weekday' end;
    select * into rule from public.assignment_schedule_rules r
      where r.work_assignment_id = assignment.id and r.day_type = resolved_day_type;
    working := coalesce(rule.is_working_day, true);
    start_time := coalesce(rule.in_time, assignment.in_time);
    end_minutes := coalesce(rule.out_time, assignment.out_time);
    -- Custom company holidays are days off, not public-holiday time overrides.
    if exists (select 1 from public.public_holidays h where h.holiday_date = calendar.work_day
      and h.selected = 'Y' and h.holiday_type = 'custom') then working := false; end if;
    if assignment.work_style = '1' and calendar.offset_days % 2 = 1 then working := false; end if;
    if exists (select 1 from public.work_assignment_days_off d
      where d.work_assignment_id = assignment.id and d.day_off_date = calendar.work_day) then working := false; end if;
    if not working then
      insert into public.work_assignment_days_off(work_assignment_id, day_off_date, schedule_generated)
        values (assignment.id, calendar.work_day, true)
        on conflict (work_assignment_id, day_off_date) do nothing;
      continue;
    end if;
    -- Legacy alternate shifts may use 06:00 instead of 30:00; normalize only that legacy representation.
    if assignment.work_style = '1' and end_minutes < 1440 then end_minutes := end_minutes + 1440; end if;
    if end_minutes <= extract(hour from start_time)::integer * 60 + extract(minute from start_time)::integer then
      raise exception '퇴근시간은 출근시간 이후로 입력하세요.';
    end if;
    insert into public.work_record(employee_id, worksite_id, work_date, intime, outtime, intime_status, outtime_status, updated_at)
      values (assignment.employee_id, assignment.worksite_id, calendar.work_day,
        (calendar.work_day + start_time) at time zone 'Asia/Seoul',
        (calendar.work_day + make_interval(mins => end_minutes)) at time zone 'Asia/Seoul', '0', '0', now())
      on conflict (employee_id, work_date) do nothing;
    generated := generated + 1;
  end loop;
  return generated;
end;
$$;
revoke all on function public.generate_assignment_daily_attendance(uuid) from public, anon, authenticated;
grant execute on function public.generate_assignment_daily_attendance(uuid) to service_role;

create function public.create_assignment_with_schedule_rules(
  p_employee_id uuid, p_worksite_id uuid, p_start_date date, p_end_date date,
  p_work_style text default null, p_has_weekend boolean default null,
  p_in_time time default null, p_out_time integer default null, p_schedule_rules jsonb default null
) returns public.work_assignments language plpgsql security invoker set search_path = '' as $$
declare
  employee public.employees%rowtype;
  assignment public.work_assignments%rowtype;
  rules jsonb;
begin
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception '근무기간이 올바르지 않습니다.';
  end if;
  select * into strict employee from public.employees where id = p_employee_id for update;
  if exists (select 1 from public.work_assignments where employee_id = p_employee_id
    and start_date <= p_end_date and end_date >= p_start_date) then
    raise exception '해당 직원의 근무기간이 기존 배정과 겹칩니다.';
  end if;
  if p_schedule_rules is null then
    select coalesce(jsonb_agg(jsonb_build_object('day_type', r.day_type, 'is_working_day', r.is_working_day,
      'in_time', r.in_time, 'out_time', r.out_time)), '[]') into rules
      from public.employee_schedule_rules r where r.employee_id = employee.id;
    if not employee.schedule_rules_enabled and coalesce(p_has_weekend, employee.has_weekend) then
      rules := '[{"day_type":"saturday","is_working_day":false},{"day_type":"sunday","is_working_day":false},{"day_type":"holiday","is_working_day":false}]';
    end if;
  else rules := p_schedule_rules; end if;
  if jsonb_typeof(rules) is distinct from 'array' or jsonb_array_length(rules) > 4 then
    raise exception '요일별 근무 설정이 올바르지 않습니다.';
  end if;
  insert into public.work_assignments(employee_id, worksite_id, start_date, end_date, work_style, has_weekend, in_time, out_time, schedule_rules_enabled)
    values (p_employee_id, p_worksite_id, p_start_date, p_end_date, coalesce(p_work_style, employee.work_style), false,
      coalesce(p_in_time, employee.in_time), coalesce(p_out_time, employee.out_time), true)
    returning * into assignment;
  if assignment.work_style = '0' and exists (
    select 1 from jsonb_to_recordset(rules) as r(out_time integer) where r.out_time >= 1440
  ) then raise exception '일반근무 퇴근시간은 24시 이전으로 입력하세요.'; end if;
  insert into public.assignment_schedule_rules(work_assignment_id, day_type, is_working_day, in_time, out_time)
    select assignment.id, r.day_type, r.is_working_day, r.in_time, r.out_time
    from jsonb_to_recordset(rules) as r(day_type text, is_working_day boolean, in_time time, out_time integer);
  perform public.generate_assignment_daily_attendance(assignment.id);
  return assignment;
end;
$$;
revoke all on function public.create_assignment_with_schedule_rules(uuid,uuid,date,date,text,boolean,time,integer,jsonb) from public, anon, authenticated;
grant execute on function public.create_assignment_with_schedule_rules(uuid,uuid,date,date,text,boolean,time,integer,jsonb) to service_role;
notify pgrst, 'reload schema';

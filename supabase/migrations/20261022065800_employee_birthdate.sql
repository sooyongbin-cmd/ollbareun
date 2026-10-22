alter table public.employees add column birthdate date;
update public.employees set birthdate = date '1966-01-01' where birthdate is null;
alter table public.employees alter column birthdate set default date '1966-01-01';
alter table public.employees alter column birthdate set not null;
comment on column public.employees.birthdate is '생년월일';

create or replace function public.save_employee_with_schedule(p_employee jsonb, p_rules jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  employee public.employees%rowtype;
  employee_id uuid := (p_employee->>'id')::uuid;
begin
  if jsonb_typeof(p_rules) is distinct from 'array' or jsonb_array_length(p_rules) > 9 then
    raise exception '요일별 근무 설정이 올바르지 않습니다.';
  end if;
  if employee_id is null then
    insert into public.employees (name, birthdate, phone, phone_normalized, role, work_style, in_time, out_time,
      has_weekend, is_retired, retired_at, schedule_rules_enabled)
    values (p_employee->>'name', coalesce((p_employee->>'birthdate')::date, date '1966-01-01'), p_employee->>'phone', p_employee->>'phone_normalized',
      coalesce(p_employee->>'role', '경비원'), coalesce(p_employee->>'work_style', '0'),
      coalesce((p_employee->>'in_time')::time, '08:00'), coalesce((p_employee->>'out_time')::integer, 1080),
      false, false, null, true)
    on conflict (name, phone_normalized) do update set birthdate = excluded.birthdate, role = excluded.role, work_style = excluded.work_style,
      in_time = excluded.in_time, out_time = excluded.out_time, has_weekend = false,
      is_retired = false, retired_at = null, schedule_rules_enabled = true
    returning * into employee;
  else
    select * into strict employee from public.employees where id = employee_id for update;
    employee := jsonb_populate_record(employee, p_employee);
    update public.employees set name = employee.name, birthdate = employee.birthdate, phone = employee.phone, phone_normalized = employee.phone_normalized,
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

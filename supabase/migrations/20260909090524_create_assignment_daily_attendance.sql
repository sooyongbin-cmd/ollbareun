create table public.work_assignment_daily_attendance (
  id uuid primary key default gen_random_uuid(),
  work_assignment_id uuid not null references public.work_assignments(id) on delete cascade,
  work_date date not null,
  intime timestamptz,
  outtime timestamptz,
  created_at timestamptz not null default now(),
  constraint work_assignment_daily_attendance_date_key unique (work_assignment_id, work_date),
  constraint work_assignment_daily_attendance_has_time check (intime is not null or outtime is not null),
  constraint work_assignment_daily_attendance_in_date check (intime is null or (intime at time zone 'Asia/Seoul')::date = work_date),
  constraint work_assignment_daily_attendance_out_date check (outtime is null or (outtime at time zone 'Asia/Seoul')::date = work_date)
);
comment on table public.work_assignment_daily_attendance is '근무배정별 날짜별 출퇴근 예정 시각. 실제 출퇴근 기록과 별도 관리.';
alter table public.work_assignment_daily_attendance enable row level security;
revoke all on public.work_assignment_daily_attendance from public, anon, authenticated;
grant select, insert, update, delete on public.work_assignment_daily_attendance to service_role;

create or replace function public.generate_assignment_daily_attendance(p_assignment_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  assignment public.work_assignments%rowtype;
  style text;
  clock_in time;
  clock_out time;
  inserted_count integer;
begin
  select * into strict assignment from public.work_assignments where id = p_assignment_id for update;
  select e.work_style, coalesce(assignment.in_time, e.in_time), coalesce(assignment.out_time, e.out_time)
    into style, clock_in, clock_out
    from public.employees e where e.id = assignment.employee_id;
  if style is null or style not in ('1', '2') or clock_in is null or clock_out is null then
    raise exception '근무형태 또는 출퇴근 시간이 올바르지 않습니다.';
  end if;

  delete from public.work_assignment_daily_attendance where work_assignment_id = p_assignment_id;
  insert into public.work_assignment_daily_attendance (work_assignment_id, work_date, intime, outtime)
  select p_assignment_id, d.day,
    case when (style = '1' and d.offset_days % 2 = 0 and d.day < assignment.end_date)
               or (style = '2' and d.day < assignment.end_date)
      then (d.day + clock_in) at time zone 'Asia/Seoul' end,
    case when (style = '1' and d.offset_days % 2 = 1)
               or (style = '2' and d.day > assignment.start_date)
      then (d.day + clock_out) at time zone 'Asia/Seoul' end
  from (
    select assignment.start_date + n as day, n as offset_days
    from generate_series(0, assignment.end_date - assignment.start_date) n
  ) d
  where (style = '1' and (d.offset_days % 2 = 1 or d.day < assignment.end_date))
     or (style = '2' and assignment.start_date < assignment.end_date);
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke all on function public.generate_assignment_daily_attendance(uuid) from public, anon, authenticated;
grant execute on function public.generate_assignment_daily_attendance(uuid) to service_role;

create or replace function public.create_assignment_with_daily_attendance(
  p_employee_id uuid, p_worksite_id uuid, p_start_date date, p_end_date date,
  p_in_time time default null, p_out_time time default null
)
returns public.work_assignments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  employee public.employees%rowtype;
  assignment public.work_assignments%rowtype;
begin
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception '근무기간이 올바르지 않습니다.';
  end if;
  select * into strict employee from public.employees where id = p_employee_id for update;
  if exists (
    select 1 from public.work_assignments where employee_id = p_employee_id
      and start_date <= p_end_date and end_date >= p_start_date
  ) then
    raise exception '해당 직원의 근무기간이 기존 배정과 겹칩니다.';
  end if;
  insert into public.work_assignments (employee_id, worksite_id, start_date, end_date, in_time, out_time)
    values (p_employee_id, p_worksite_id, p_start_date, p_end_date,
      coalesce(p_in_time, employee.in_time), coalesce(p_out_time, employee.out_time))
    returning * into assignment;
  perform public.generate_assignment_daily_attendance(assignment.id);
  return assignment;
end;
$$;
revoke all on function public.create_assignment_with_daily_attendance(uuid, uuid, date, date, time, time) from public, anon, authenticated;
grant execute on function public.create_assignment_with_daily_attendance(uuid, uuid, date, date, time, time) to service_role;

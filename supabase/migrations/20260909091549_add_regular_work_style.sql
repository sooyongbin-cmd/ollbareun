alter table public.employees drop constraint employees_work_style_check;
alter table public.employees add constraint employees_work_style_check check (work_style in ('0', '1', '2'));

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
  if style is null or style not in ('0', '1', '2') or clock_in is null or clock_out is null then
    raise exception '근무형태 또는 출퇴근 시간이 올바르지 않습니다.';
  end if;

  delete from public.work_assignment_daily_attendance where work_assignment_id = p_assignment_id;
  insert into public.work_assignment_daily_attendance (work_assignment_id, work_date, intime, outtime)
  select p_assignment_id, d.day,
    case when style = '0' or (style = '1' and d.offset_days % 2 = 0 and d.day < assignment.end_date)
               or (style = '2' and d.day < assignment.end_date)
      then (d.day + clock_in) at time zone 'Asia/Seoul' end,
    case when style = '0' or (style = '1' and d.offset_days % 2 = 1)
               or (style = '2' and d.day > assignment.start_date)
      then (d.day + clock_out) at time zone 'Asia/Seoul' end
  from (
    select assignment.start_date + n as day, n as offset_days
    from generate_series(0, assignment.end_date - assignment.start_date) n
  ) d
  where style = '0' or (style = '1' and (d.offset_days % 2 = 1 or d.day < assignment.end_date))
     or (style = '2' and assignment.start_date < assignment.end_date);
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke all on function public.generate_assignment_daily_attendance(uuid) from public, anon, authenticated;
grant execute on function public.generate_assignment_daily_attendance(uuid) to service_role;


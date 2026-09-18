create table public.work_record (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  worksite_id uuid not null references public.worksites(id) on delete cascade,
  work_date date not null default current_date,
  intime timestamptz,
  outtime timestamptz,
  work_intime timestamptz,
  work_outtime timestamptz,
  intime_status text not null default '0',
  outtime_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  clock_in_latitude double precision,
  clock_in_longitude double precision,
  clock_out_latitude double precision,
  clock_out_longitude double precision,
  constraint work_record_employee_date_key unique (employee_id, work_date),
  constraint work_record_intime_status_check check (intime_status in ('0', '1', '2', '3')),
  constraint work_record_outtime_status_check check (outtime_status is null or outtime_status = '4'),
  constraint work_record_outtime_requires_intime check (work_outtime is null or work_intime is not null)
);

comment on table public.work_record is '직원별 일자 기준 근무예정 및 출퇴근 통합 기록';
comment on column public.work_record.intime is '출근 예정일시';
comment on column public.work_record.outtime is '퇴근 예정일시';
comment on column public.work_record.work_intime is '출근일시';
comment on column public.work_record.work_outtime is '퇴근일시';
comment on column public.work_record.intime_status is '출근상태: 0 결근, 1 지각, 2 정상출근, 3 정상근무';
comment on column public.work_record.outtime_status is '퇴근상태: 4 조기퇴근';

create index work_record_work_date_idx on public.work_record (work_date);
create index work_record_worksite_id_idx on public.work_record (worksite_id);

alter table public.work_record enable row level security;
revoke all on public.work_record from public, anon, authenticated;
grant select, insert, update, delete on public.work_record to service_role;

insert into public.work_record (
  id,
  employee_id,
  worksite_id,
  work_date,
  intime,
  outtime,
  work_intime,
  work_outtime,
  intime_status,
  outtime_status,
  created_at,
  updated_at,
  clock_in_latitude,
  clock_in_longitude,
  clock_out_latitude,
  clock_out_longitude
)
select
  coalesce(actual.id, gen_random_uuid()),
  coalesce(scheduled.employee_id, actual.employee_id),
  coalesce(actual.worksite_id, scheduled.worksite_id),
  coalesce(scheduled.work_date, actual.work_date),
  scheduled.intime,
  scheduled.outtime,
  actual.clock_in_at,
  actual.clock_out_at,
  case
    when actual.clock_in_at is null then '0'
    when actual.clock_out_at is not null
      and (scheduled.outtime is null or actual.clock_out_at >= scheduled.outtime) then '3'
    when scheduled.intime is not null and actual.clock_in_at > scheduled.intime then '1'
    else '2'
  end,
  case
    when actual.clock_out_at is not null
      and scheduled.outtime is not null
      and actual.clock_out_at < scheduled.outtime then '4'
    else null
  end,
  coalesce(actual.created_at, scheduled.created_at, now()),
  coalesce(actual.updated_at, scheduled.created_at, now()),
  actual.clock_in_latitude,
  actual.clock_in_longitude,
  actual.clock_out_latitude,
  actual.clock_out_longitude
from (
  select distinct on (wa.employee_id, daily.work_date)
    wa.employee_id,
    wa.worksite_id,
    daily.work_date,
    daily.intime,
    daily.outtime,
    daily.created_at
  from public.work_assignment_daily_attendance daily
  join public.work_assignments wa on wa.id = daily.work_assignment_id
  order by wa.employee_id, daily.work_date, daily.created_at desc
) scheduled
full join public.attendance_records actual
  on actual.employee_id = scheduled.employee_id
 and actual.work_date = scheduled.work_date;

drop table if exists public.work_assignment_daily_attendance cascade;
drop table if exists public.attendance_records cascade;

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
  calendar record;
  inserted_count integer := 0;
  is_day_off boolean := false;
  has_clock_in boolean := false;
  has_clock_out boolean := false;
  previous_day_has_clock_in boolean := false;
begin
  select * into strict assignment
  from public.work_assignments
  where id = p_assignment_id
  for update;

  select e.work_style, coalesce(assignment.in_time, e.in_time), coalesce(assignment.out_time, e.out_time)
    into style, clock_in, clock_out
    from public.employees e
    where e.id = assignment.employee_id;

  if style is null or style not in ('0', '1', '2') or clock_in is null or clock_out is null then
    raise exception '근무형태 또는 출퇴근 시간이 올바르지 않습니다.';
  end if;

  delete from public.work_record
  where employee_id = assignment.employee_id
    and work_date between assignment.start_date and assignment.end_date
    and work_intime is null
    and work_outtime is null;

  for calendar in
    select assignment.start_date + n as work_day, n as offset_days
    from generate_series(0, assignment.end_date - assignment.start_date) as n
  loop
    is_day_off := false;
    has_clock_in := false;
    has_clock_out := false;

    if style = '2' then
      is_day_off := extract(isodow from calendar.work_day) in (6, 7)
        or exists (
          select 1
          from public.public_holidays holiday
          where holiday.holiday_date = calendar.work_day
            and holiday.selected = 'Y'
        );

      if is_day_off then
        insert into public.work_assignment_days_off (work_assignment_id, day_off_date)
        values (p_assignment_id, calendar.work_day)
        on conflict (work_assignment_id, day_off_date) do nothing;
      end if;

      has_clock_in := calendar.work_day < assignment.end_date and not is_day_off;
      has_clock_out := calendar.work_day > assignment.start_date and previous_day_has_clock_in;
    elsif style = '0' then
      has_clock_in := true;
      has_clock_out := true;
    else
      has_clock_in := calendar.offset_days % 2 = 0 and calendar.work_day < assignment.end_date;
      has_clock_out := calendar.offset_days % 2 = 1;
    end if;

    if has_clock_in or has_clock_out then
      insert into public.work_record (
        employee_id, worksite_id, work_date, intime, outtime, intime_status, updated_at
      )
      values (
        assignment.employee_id,
        assignment.worksite_id,
        calendar.work_day,
        case when has_clock_in then (calendar.work_day + clock_in) at time zone 'Asia/Seoul' end,
        case when has_clock_out then (calendar.work_day + clock_out) at time zone 'Asia/Seoul' end,
        '0',
        now()
      )
      on conflict (employee_id, work_date) do update set
        worksite_id = excluded.worksite_id,
        intime = excluded.intime,
        outtime = excluded.outtime,
        intime_status = case
          when work_record.work_intime is null then '0'
          when work_record.work_outtime is not null
            and (excluded.outtime is null or work_record.work_outtime >= excluded.outtime) then '3'
          when excluded.intime is not null and work_record.work_intime > excluded.intime then '1'
          else '2'
        end,
        outtime_status = case
          when work_record.work_outtime is not null
            and excluded.outtime is not null
            and work_record.work_outtime < excluded.outtime then '4'
          else null
        end,
        updated_at = now();
      inserted_count := inserted_count + 1;
    end if;

    if style = '2' then
      previous_day_has_clock_in := has_clock_in;
    end if;
  end loop;

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

  select * into strict employee
  from public.employees
  where id = p_employee_id
  for update;

  if exists (
    select 1
    from public.work_assignments
    where employee_id = p_employee_id
      and start_date <= p_end_date
      and end_date >= p_start_date
  ) then
    raise exception '해당 직원의 근무기간이 기존 배정과 겹칩니다.';
  end if;

  insert into public.work_assignments (employee_id, worksite_id, start_date, end_date, in_time, out_time)
    values (
      p_employee_id,
      p_worksite_id,
      p_start_date,
      p_end_date,
      coalesce(p_in_time, employee.in_time),
      coalesce(p_out_time, employee.out_time)
    )
    returning * into assignment;

  perform public.generate_assignment_daily_attendance(assignment.id);
  return assignment;
end;
$$;

revoke all on function public.create_assignment_with_daily_attendance(uuid, uuid, date, date, time, time) from public, anon, authenticated;
grant execute on function public.create_assignment_with_daily_attendance(uuid, uuid, date, date, time, time) to service_role;

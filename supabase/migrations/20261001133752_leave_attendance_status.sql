alter table public.work_record
  drop constraint if exists work_record_intime_status_check;

alter table public.work_record
  add constraint work_record_intime_status_check
  check (intime_status in ('0', '1', '2', '3'));

comment on column public.work_record.intime_status is '출근상태: 0 미출근, 1 지각, 2 출근, 3 휴가';

create or replace function public.create_leave_with_attendance(
  p_employee_id uuid,
  p_leave_type text,
  p_start_date date,
  p_end_date date
)
returns public.leave
language plpgsql
set search_path = ''
as $$
declare
  conflicting_date date;
  created_leave public.leave;
begin
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception '휴가 기간이 올바르지 않습니다.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_employee_id::text));

  if exists (
    select 1
    from public.leave existing_leave
    where existing_leave.employee_id = p_employee_id
      and existing_leave.start_date <= p_end_date
      and existing_leave.end_date >= p_start_date
  ) then
    raise exception '휴가신청기간이 겹칩니다.';
  end if;

  perform wr.id
  from public.work_record wr
  where wr.employee_id = p_employee_id
    and wr.work_date between p_start_date and p_end_date
  for update;

  select wr.work_date
  into conflicting_date
  from public.work_record wr
  where wr.employee_id = p_employee_id
    and wr.work_date between p_start_date and p_end_date
    and wr.intime_status <> '0'
  order by wr.work_date
  limit 1;

  if found then
    raise exception '날짜 % 에 출근정보가 있어서 휴가처리를 할 수 없습니다.',
      pg_catalog.to_char(conflicting_date, 'YYYY-MM-DD');
  end if;

  insert into public.leave (employee_id, leave_type, start_date, end_date, updated_at)
  values (p_employee_id, p_leave_type, p_start_date, p_end_date, pg_catalog.now())
  returning * into created_leave;

  update public.work_record
  set intime_status = '3',
      updated_at = pg_catalog.now()
  where employee_id = p_employee_id
    and work_date between p_start_date and p_end_date
    and intime_status = '0';

  return created_leave;
end;
$$;

revoke all on function public.create_leave_with_attendance(uuid, text, date, date) from public, anon, authenticated;
grant execute on function public.create_leave_with_attendance(uuid, text, date, date) to service_role;

create or replace function public.delete_leave_with_attendance(p_leave_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  target_leave public.leave;
begin
  select * into target_leave
  from public.leave
  where id = p_leave_id
  for update;

  if not found then
    raise exception '휴가 정보를 찾을 수 없습니다.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(target_leave.employee_id::text));

  update public.work_record wr
  set intime_status = '0',
      updated_at = pg_catalog.now()
  where wr.employee_id = target_leave.employee_id
    and wr.work_date between target_leave.start_date and target_leave.end_date
    and wr.intime_status = '3'
    and not exists (
      select 1
      from public.leave other_leave
      where other_leave.employee_id = target_leave.employee_id
        and other_leave.id <> target_leave.id
        and wr.work_date between other_leave.start_date and other_leave.end_date
    );

  delete from public.leave where id = target_leave.id;
end;
$$;

revoke all on function public.delete_leave_with_attendance(uuid) from public, anon, authenticated;
grant execute on function public.delete_leave_with_attendance(uuid) to service_role;

create function public.update_leave_with_attendance(
  p_leave_id uuid,
  p_leave_type text,
  p_start_date date,
  p_end_date date
)
returns public.leave
language plpgsql
set search_path = ''
as $$
declare
  target_leave public.leave;
  conflicting_date date;
begin
  select * into target_leave
  from public.leave
  where id = p_leave_id
  for update;

  if not found then
    raise exception '휴가 정보를 찾을 수 없습니다.';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception '종료일은 시작일보다 빠를 수 없습니다.';
  end if;

  if nullif(pg_catalog.btrim(p_leave_type), '') is null then
    raise exception '휴가종류를 입력하세요.';
  end if;

  if p_start_date <> target_leave.start_date or p_end_date <> target_leave.end_date then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(target_leave.employee_id::text));

    if exists (
      select 1 from public.leave other_leave
      where other_leave.employee_id = target_leave.employee_id
        and other_leave.id <> p_leave_id
        and other_leave.start_date <= p_end_date
        and other_leave.end_date >= p_start_date
    ) then
      raise exception '휴가신청기간이 겹칩니다.';
    end if;

    perform wr.id
    from public.work_record wr
    where wr.employee_id = target_leave.employee_id
      and wr.work_date between least(target_leave.start_date, p_start_date) and greatest(target_leave.end_date, p_end_date)
    order by wr.work_date, wr.id
    for update;

    select min(wr.work_date) into conflicting_date
    from public.work_record wr
    where wr.employee_id = target_leave.employee_id
      and wr.work_date between p_start_date and p_end_date
      and (wr.work_intime is not null or wr.work_outtime is not null or wr.intime_status in ('1', '2'));

    if conflicting_date is not null then
      raise exception '날짜 % 에 근무 기록이 있어 휴가기간을 변경할 수 없습니다.',
        pg_catalog.to_char(conflicting_date, 'YYYY-MM-DD');
    end if;

    update public.work_record wr
    set intime_status = '3', updated_at = pg_catalog.now()
    where wr.employee_id = target_leave.employee_id
      and wr.work_date between p_start_date and p_end_date
      and wr.intime_status = '0';

    update public.work_record wr
    set intime_status = '0', updated_at = pg_catalog.now()
    where wr.employee_id = target_leave.employee_id
      and wr.work_date between target_leave.start_date and target_leave.end_date
      and (wr.work_date < p_start_date or wr.work_date > p_end_date)
      and wr.intime_status = '3'
      and wr.work_intime is null
      and wr.work_outtime is null
      and not exists (
        select 1 from public.leave other_leave
        where other_leave.employee_id = target_leave.employee_id
          and other_leave.id <> p_leave_id
          and wr.work_date between other_leave.start_date and other_leave.end_date
      );
  end if;

  update public.leave
  set leave_type = p_leave_type, start_date = p_start_date, end_date = p_end_date, updated_at = pg_catalog.now()
  where id = p_leave_id
  returning * into target_leave;

  return target_leave;
end;
$$;

revoke all on function public.update_leave_with_attendance(uuid, text, date, date) from public, anon, authenticated;
grant execute on function public.update_leave_with_attendance(uuid, text, date, date) to service_role;

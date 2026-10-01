-- Attendance saves only work records. Education records are created by complete_education.
create or replace function public.save_attendance(p_record_id uuid,p_values jsonb,p_guard_clock_in boolean default false)
returns public.work_record language plpgsql security invoker set search_path = '' as $$
declare
  v_old public.work_record;
  v_saved public.work_record;
  v_employee uuid;
  v_in timestamptz;
  v_out timestamptz;
begin
  if p_record_id is not null then
    select employee_id into v_employee from public.work_record where id=p_record_id;
    if not found then raise exception '근태 기록을 확인할 수 없습니다.'; end if;
  else
    v_employee := (p_values->>'employee_id')::uuid;
  end if;
  if v_employee is null then raise exception '직원을 확인할 수 없습니다.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_employee::text,0));
  if p_record_id is not null then
    select * into v_old from public.work_record where id=p_record_id for update;
    if not found then raise exception '근태 기록을 확인할 수 없습니다.'; end if;
    if p_guard_clock_in and v_old.work_intime is not null then raise exception '이미 출근 처리되었습니다.'; end if;
    v_in := case when p_values ? 'work_intime' then (p_values->>'work_intime')::timestamptz else v_old.work_intime end;
    v_out := case when p_values ? 'work_outtime' then (p_values->>'work_outtime')::timestamptz else v_old.work_outtime end;
    if v_out is not null and (v_in is null or v_out < v_in) then raise exception '퇴근일시는 출근일시 이후여야 합니다.'; end if;
    update public.work_record set
      work_intime=v_in, work_outtime=v_out,
      intime_status=case when v_in is null then '0' when intime is not null and v_in>intime then '1' else '2' end,
      outtime_status=case when v_out is null then '0' when outtime is not null and v_out<outtime then '1' else '2' end,
      clock_in_latitude=case when p_values ? 'clock_in_latitude' then (p_values->>'clock_in_latitude')::float8 else clock_in_latitude end,
      clock_in_longitude=case when p_values ? 'clock_in_longitude' then (p_values->>'clock_in_longitude')::float8 else clock_in_longitude end,
      updated_at=now()
    where id=p_record_id returning * into v_saved;
  else
    if not p_guard_clock_in then raise exception '근태 기록 ID가 필요합니다.'; end if;
    v_in := (p_values->>'work_intime')::timestamptz;
    if v_in is null then raise exception '출근일시가 필요합니다.'; end if;
    insert into public.work_record(employee_id,worksite_id,work_date,work_intime,intime_status,outtime_status,clock_in_latitude,clock_in_longitude)
    values(v_employee,(p_values->>'worksite_id')::uuid,(v_in at time zone 'Asia/Seoul')::date,v_in,'2','0',
      (p_values->>'clock_in_latitude')::float8,(p_values->>'clock_in_longitude')::float8)
    returning * into v_saved;
  end if;
  return v_saved;
end;
$$;

revoke all on function public.save_attendance(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.save_attendance(uuid,jsonb,boolean) to service_role;

-- Keep already deployed callers working while the application is updated.
-- This compatibility entry point also performs attendance-only writes.
create or replace function public.save_attendance_with_education(p_record_id uuid,p_values jsonb,p_guard_clock_in boolean default false)
returns public.work_record language sql security invoker set search_path = '' as $$
  select * from public.save_attendance(p_record_id,p_values,p_guard_clock_in);
$$;
revoke all on function public.save_attendance_with_education(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.save_attendance_with_education(uuid,jsonb,boolean) to service_role;

drop function public.ensure_attendance_education(uuid,date);

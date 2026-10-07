create or replace function public.schedule_education_reminder_job()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  delay_content text;
  delay_minutes integer := 30;
begin
  if tg_op = 'UPDATE'
    and old.work_intime is not distinct from new.work_intime
    and old.work_date is not distinct from new.work_date
    and old.employee_id is not distinct from new.employee_id then
    return new;
  end if;

  if new.work_intime is null then
    update public.education_reminder_jobs
    set status = 'cancelled',
        locked_until = null,
        finished_at = now(),
        updated_at = now()
    where work_record_id = new.id
      and status in ('pending', 'processing', 'failed');
    return new;
  end if;

  -- Snapshot the current minute setting when attendance creates or resets a job.
  -- Missing or malformed legacy settings retain the previous 30-minute default.
  select btrim(content) into delay_content
  from public.system_configs where system_code = 'S000001';
  if delay_content ~ '^[0-9]{1,10}$' then
    if delay_content::numeric <= 2147483647 then
      delay_minutes := delay_content::integer;
    end if;
  end if;
  insert into public.education_reminder_jobs (
    work_record_id,
    employee_id,
    work_date,
    due_at,
    status,
    attempts,
    next_attempt_at,
    locked_until,
    sent_at,
    finished_at,
    last_error,
    updated_at
  ) values (
    new.id,
    new.employee_id,
    new.work_date,
    new.work_intime + make_interval(mins => delay_minutes),
    'pending',
    0,
    now(),
    null,
    null,
    null,
    null,
    now()
  )
  on conflict (work_record_id) do update
  set employee_id = excluded.employee_id,
      work_date = excluded.work_date,
      due_at = excluded.due_at,
      status = 'pending',
      attempts = 0,
      next_attempt_at = now(),
      locked_until = null,
      sent_at = null,
      finished_at = null,
      last_error = null,
      updated_at = now()
  where public.education_reminder_jobs.status in ('pending', 'processing', 'failed', 'cancelled');

  return new;
end;
$$;

revoke all on function public.schedule_education_reminder_job() from public, anon, authenticated;
grant execute on function public.schedule_education_reminder_job() to service_role;

comment on table public.education_reminder_jobs is '출근 후 시스템설정 S000001의 대기시간(분)이 지난 안전교육 미이수 예약 작업';

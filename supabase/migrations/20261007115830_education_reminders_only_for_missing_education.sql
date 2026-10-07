-- Match monthly_edu: daily completions on the work date, other types in its month.
create or replace function public.missing_education_count(p_employee_id uuid, p_work_date date)
returns integer
language sql stable security invoker set search_path = ''
as $$
  select count(*)::integer from public.education_resources r
  where r.startdate <= p_work_date and r.enddate >= p_work_date
    and r.education_type in ('일일', '월간', '분기', '반기', '기타')
    and not exists (
      select 1 from public.education_completions c
      where c.employee_id = p_employee_id
        and c.title = r.title and c.education_type = r.education_type
        and case when r.education_type = '일일' then c.work_date = p_work_date
          else c.work_date >= date_trunc('month', p_work_date)::date
            and c.work_date < (date_trunc('month', p_work_date) + interval '1 month')::date
        end
    );
$$;

create or replace function public.education_reminder_delay_minutes()
returns integer
language plpgsql stable security invoker set search_path = ''
as $$
declare delay_content text;
begin
  select btrim(content) into delay_content from public.system_configs where system_code = 'S000001';
  if delay_content ~ '^[0-9]{1,10}$' then
    if delay_content::numeric <= 2147483647 then return delay_content::integer; end if;
  end if;
  return 30;
end;
$$;

create or replace function public.schedule_education_reminder_job()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and old.work_intime is not distinct from new.work_intime
    and old.work_date is not distinct from new.work_date
    and old.employee_id is not distinct from new.employee_id then return new;
  end if;
  if new.work_intime is null
    or public.missing_education_count(new.employee_id, new.work_date) = 0 then
    update public.education_reminder_jobs
    set status = 'cancelled', locked_until = null, finished_at = now(), updated_at = now()
    where work_record_id = new.id and status in ('pending', 'processing', 'failed');
    return new;
  end if;
  insert into public.education_reminder_jobs (
    work_record_id, employee_id, work_date, due_at, status, attempts,
    next_attempt_at, locked_until, sent_at, finished_at, last_error, updated_at
  ) values (
    new.id, new.employee_id, new.work_date,
    new.work_intime + make_interval(mins => public.education_reminder_delay_minutes()),
    'pending', 0, now(), null, null, null, null, now()
  )
  on conflict (work_record_id) do update
  set employee_id = excluded.employee_id, work_date = excluded.work_date,
      due_at = excluded.due_at, status = 'pending', attempts = 0,
      next_attempt_at = now(), locked_until = null, sent_at = null,
      finished_at = null, last_error = null, updated_at = now()
  where public.education_reminder_jobs.status in ('pending', 'processing', 'failed', 'cancelled');
  return new;
end;
$$;

-- Recheck dates, attendance and completions instead of trusting browser counts.
create or replace function public.register_daily_education_reminders(p_work_date date, p_employee_ids uuid[])
returns table(registered_count integer, delay_minutes integer)
language plpgsql security invoker set search_path = ''
as $$
declare
  v_delay integer := public.education_reminder_delay_minutes();
  v_now timestamptz := now();
  v_start timestamptz;
  v_end timestamptz;
  v_count integer;
begin
  if p_work_date is null or p_work_date <> (v_now at time zone 'Asia/Seoul')::date then
    raise exception '근무일을 오늘로 조회한 후 교육알림 처리해주세요.';
  end if;
  v_start := p_work_date::timestamp at time zone 'Asia/Seoul';
  v_end := (p_work_date + 1)::timestamp at time zone 'Asia/Seoul';
  with targets as (
    -- Same daily_edu attendance membership, including overnight workers.
    select distinct on (w.employee_id) w.id, w.employee_id from public.work_record w
    where w.employee_id = any(p_employee_ids) and w.work_intime is not null
      and ((w.work_intime >= v_start and w.work_intime < v_end)
        or (w.outtime >= v_start and w.outtime < v_end))
      and public.missing_education_count(w.employee_id, p_work_date) > 0
    order by w.employee_id, (w.work_date = p_work_date) desc, w.work_intime desc, w.id
  ), registered as (
    insert into public.education_reminder_jobs (
      work_record_id, employee_id, work_date, due_at, status, attempts,
      next_attempt_at, locked_until, sent_at, finished_at, last_error, updated_at
    )
    select id, employee_id, p_work_date, v_now + make_interval(mins => v_delay),
      'pending', 0, v_now, null, null, null, null, v_now from targets
    on conflict (work_record_id) do update
    set employee_id = excluded.employee_id, work_date = excluded.work_date,
        due_at = excluded.due_at, status = 'pending', attempts = 0,
        next_attempt_at = excluded.next_attempt_at, locked_until = null,
        sent_at = null, finished_at = null, last_error = null, updated_at = excluded.updated_at
    where public.education_reminder_jobs.status <> 'processing'
    returning work_record_id
  ) select count(*)::integer into v_count from registered;
  return query select v_count, v_delay;
end;
$$;

revoke all on function public.missing_education_count(uuid, date) from public, anon, authenticated;
revoke all on function public.education_reminder_delay_minutes() from public, anon, authenticated;
revoke all on function public.register_daily_education_reminders(date, uuid[]) from public, anon, authenticated;
revoke all on function public.schedule_education_reminder_job() from public, anon, authenticated;
grant execute on function public.missing_education_count(uuid, date),
  public.education_reminder_delay_minutes(), public.register_daily_education_reminders(date, uuid[]),
  public.schedule_education_reminder_job() to service_role;

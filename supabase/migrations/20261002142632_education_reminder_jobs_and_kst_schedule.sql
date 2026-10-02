create table if not exists public.education_reminder_jobs (
  work_record_id uuid primary key references public.work_record(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  due_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'skipped', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  sent_at timestamptz,
  finished_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.education_reminder_jobs is
  '출근 30분 후 안전교육 미이수 여부를 확인하는 예약 작업';

create index if not exists education_reminder_jobs_due_idx
  on public.education_reminder_jobs (due_at, next_attempt_at)
  where status = 'pending';

create index if not exists education_reminder_jobs_lease_idx
  on public.education_reminder_jobs (locked_until)
  where status = 'processing';

alter table public.education_reminder_jobs enable row level security;
revoke all on table public.education_reminder_jobs from public, anon, authenticated;
grant select, insert, update, delete on table public.education_reminder_jobs to service_role;

create or replace function public.schedule_education_reminder_job()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
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
    new.work_intime + interval '30 minutes',
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

drop trigger if exists work_record_schedule_education_reminder_insert on public.work_record;
create trigger work_record_schedule_education_reminder_insert
after insert on public.work_record
for each row execute function public.schedule_education_reminder_job();

drop trigger if exists work_record_schedule_education_reminder_update on public.work_record;
create trigger work_record_schedule_education_reminder_update
after update of work_intime, work_date, employee_id on public.work_record
for each row execute function public.schedule_education_reminder_job();

create or replace function public.claim_due_education_reminder_jobs(p_batch_size integer default 50)
returns table (
  work_record_id uuid,
  employee_id uuid,
  work_date date,
  due_at timestamptz,
  attempts integer
)
language sql
security invoker
set search_path = ''
as $$
  with due_jobs as (
    select j.work_record_id
    from public.education_reminder_jobs as j
    where (
      j.status = 'pending'
      and j.due_at <= now()
      and j.next_attempt_at <= now()
    ) or (
      j.status = 'processing'
      and j.locked_until <= now()
    )
    order by j.due_at, j.work_record_id
    limit least(greatest(coalesce(p_batch_size, 50), 1), 100)
    for update skip locked
  )
  update public.education_reminder_jobs as j
  set status = 'processing',
      attempts = j.attempts + 1,
      locked_until = now() + interval '15 minutes',
      finished_at = null,
      updated_at = now()
  from due_jobs
  where j.work_record_id = due_jobs.work_record_id
  returning j.work_record_id, j.employee_id, j.work_date, j.due_at, j.attempts;
$$;

revoke all on function public.claim_due_education_reminder_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_due_education_reminder_jobs(integer) to service_role;

-- The database timezone is UTC. These four schedules run every 10 minutes from
-- 06:20 through 23:00 Korea time, inclusive.
do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname in (
      'education-reminders',
      'education-reminders-kst-0620',
      'education-reminders-kst-0700-0850',
      'education-reminders-kst-0900-2250',
      'education-reminders-kst-2300'
    )
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'education-reminders-kst-0620',
  '20,30,40,50 21 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'education_reminders_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'education_reminders_cron_secret')
    ),
    body := jsonb_build_object('source', 'supabase-cron', 'job', 'education-reminders'),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'education-reminders-kst-0700-0850',
  '*/10 22-23 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'education_reminders_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'education_reminders_cron_secret')
    ),
    body := jsonb_build_object('source', 'supabase-cron', 'job', 'education-reminders'),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'education-reminders-kst-0900-2250',
  '*/10 0-13 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'education_reminders_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'education_reminders_cron_secret')
    ),
    body := jsonb_build_object('source', 'supabase-cron', 'job', 'education-reminders'),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'education-reminders-kst-2300',
  '0 14 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'education_reminders_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'education_reminders_cron_secret')
    ),
    body := jsonb_build_object('source', 'supabase-cron', 'job', 'education-reminders'),
    timeout_milliseconds := 30000
  );
  $$
);

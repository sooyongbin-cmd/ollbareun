create table public.month_end_education_reminder_runs (
  month_end date primary key
);

create table public.month_end_education_reminder_jobs (
  month_end date not null references public.month_end_education_reminder_runs(month_end),
  employee_id uuid not null references public.employees(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  sent_at timestamptz,
  last_error text,
  primary key (month_end, employee_id)
);

alter table public.month_end_education_reminder_runs enable row level security;
alter table public.month_end_education_reminder_jobs enable row level security;
revoke all on public.month_end_education_reminder_runs, public.month_end_education_reminder_jobs from public, anon, authenticated;
grant select, insert, update on public.month_end_education_reminder_runs, public.month_end_education_reminder_jobs to service_role;

create function public.month_end_missing_education_count(p_employee_id uuid, p_month_end date)
returns integer
language sql stable security invoker set search_path = ''
as $$
  select count(*)::integer
  from public.education_resources r
  where r.enddate >= date_trunc('month', p_month_end::timestamp)::date
    and r.enddate <= p_month_end
    and r.education_type in ('월간', '분기', '반기')
    and not exists (
      select 1
      from public.education_completions c
      where c.employee_id = p_employee_id
        and c.title = r.title
        and c.education_type = r.education_type
        and c.work_date between
          case r.education_type
            when '월간' then date_trunc('month', r.enddate::timestamp)::date
            when '분기' then date_trunc('quarter', r.enddate::timestamp)::date
            when '반기' then make_date(extract(year from r.enddate)::integer,
              case when extract(month from r.enddate) <= 6 then 1 else 7 end, 1)
          end
          and r.enddate
    );
$$;

create function public.claim_month_end_education_reminder_jobs()
returns table (
  month_end date,
  employee_id uuid,
  missing_count integer,
  attempts integer
)
language plpgsql security invoker set search_path = ''
as $$
declare
  v_now timestamp := now() at time zone 'Asia/Seoul';
  v_today date := v_now::date;
  v_setting text;
begin
  if extract(day from v_today + 1) = 1 then
    select btrim(c.content) into v_setting
    from public.system_configs c where c.system_code = 'S000003';

    if v_setting ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      if v_now::time >= v_setting::time then
        insert into public.month_end_education_reminder_runs values (v_today)
        on conflict on constraint month_end_education_reminder_runs_pkey do nothing;

        if found then
          insert into public.month_end_education_reminder_jobs (month_end, employee_id)
          select v_today, e.id from public.employees e
          where not e.is_retired and public.month_end_missing_education_count(e.id, v_today) > 0;
        end if;
      end if;
    end if;
  end if;

  update public.month_end_education_reminder_jobs j
  set status = 'failed', locked_until = null, last_error = '발송 작업 시간 초과'
  where j.status = 'processing' and j.locked_until <= now() and j.attempts >= 8;

  return query
    with due as (
      select j.month_end, j.employee_id
      from public.month_end_education_reminder_jobs j
      where (j.status = 'pending' and j.next_attempt_at <= now())
        or (j.status = 'processing' and j.locked_until <= now())
      order by j.month_end, j.next_attempt_at, j.employee_id
      limit 50 for update skip locked
    ), claimed as (
      update public.month_end_education_reminder_jobs j
      set status = 'processing', attempts = j.attempts + 1,
          locked_until = now() + interval '15 minutes'
      from due
      where j.month_end = due.month_end and j.employee_id = due.employee_id
      returning j.month_end, j.employee_id, j.attempts
    )
    select j.month_end, j.employee_id,
      case when e.is_retired then 0
        else public.month_end_missing_education_count(j.employee_id, j.month_end) end,
      j.attempts
    from claimed j join public.employees e on e.id = j.employee_id;
end;
$$;

revoke execute on function public.month_end_missing_education_count(uuid, date),
  public.claim_month_end_education_reminder_jobs() from public, anon, authenticated;
grant execute on function public.month_end_missing_education_count(uuid, date),
  public.claim_month_end_education_reminder_jobs() to service_role;

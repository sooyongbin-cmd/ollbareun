-- Applied to the production ollbareun project on 2026-09-24.
alter table public.employees
  add column if not exists retired_at timestamptz;

create table if not exists public.guard_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index if not exists guard_auth_sessions_employee_idx
  on public.guard_auth_sessions(employee_id, expires_at desc);
alter table public.guard_auth_sessions enable row level security;
revoke all on public.guard_auth_sessions from public, anon, authenticated;
grant all on public.guard_auth_sessions to service_role;

-- Hard employee/site deletion must not cascade through retained attendance history.
alter table public.work_record drop constraint if exists work_record_employee_id_fkey;
alter table public.work_record add constraint work_record_employee_id_fkey
  foreign key (employee_id) references public.employees(id) on delete restrict;
alter table public.work_record drop constraint if exists work_record_worksite_id_fkey;
alter table public.work_record add constraint work_record_worksite_id_fkey
  foreign key (worksite_id) references public.worksites(id) on delete restrict;

-- Keep the employee/worksite association on retained inspection/report records.
alter table public.inspection_logs drop constraint if exists inspection_logs_employee_id_fkey;
alter table public.inspection_logs add constraint inspection_logs_employee_id_fkey
  foreign key (employee_id) references public.employees(id) on delete restrict;
alter table public.inspection_logs drop constraint if exists inspection_logs_worksite_id_fkey;
alter table public.inspection_logs add constraint inspection_logs_worksite_id_fkey
  foreign key (worksite_id) references public.worksites(id) on delete restrict;
alter table public.inspection_special_reports drop constraint if exists inspection_special_reports_employee_id_fkey;
alter table public.inspection_special_reports add constraint inspection_special_reports_employee_id_fkey
  foreign key (employee_id) references public.employees(id) on delete restrict;
alter table public.inspection_special_reports drop constraint if exists inspection_special_reports_worksite_id_fkey;
alter table public.inspection_special_reports add constraint inspection_special_reports_worksite_id_fkey
  foreign key (worksite_id) references public.worksites(id) on delete restrict;

create or replace function public.guard_protect_work_record_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  employee_retired_at timestamptz;
begin
  select retired_at into employee_retired_at
  from public.employees where id = old.employee_id;

  if employee_retired_at is not null
    and (now() at time zone 'Asia/Seoul')::date >=
      ((employee_retired_at at time zone 'Asia/Seoul')::date + interval '5 years')::date then
    return old;
  end if;

  if old.work_date < (now() at time zone 'Asia/Seoul')::date
    or old.work_intime is not null
    or old.work_outtime is not null then
    raise exception '보관기간이 끝나지 않은 근무기록은 삭제할 수 없습니다.';
  end if;

  return old;
end;
$$;

drop trigger if exists guard_protect_work_record_delete on public.work_record;
create trigger guard_protect_work_record_delete
before delete on public.work_record
for each row execute function public.guard_protect_work_record_delete();

create or replace function public.guard_protect_special_report_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  employee_retired_at timestamptz;
begin
  if old.employee_id is null then
    raise exception '퇴사일을 확인할 수 없는 특이사항 기록은 삭제할 수 없습니다.';
  end if;

  select retired_at into employee_retired_at
  from public.employees where id = old.employee_id;
  if employee_retired_at is null
    or (now() at time zone 'Asia/Seoul')::date <
      ((employee_retired_at at time zone 'Asia/Seoul')::date + interval '5 years')::date then
    raise exception '퇴사 후 5년 보관기간이 끝나기 전 특이사항 기록을 삭제할 수 없습니다.';
  end if;

  return old;
end;
$$;

drop trigger if exists guard_protect_special_report_delete on public.inspection_special_reports;
create trigger guard_protect_special_report_delete
before delete on public.inspection_special_reports
for each row execute function public.guard_protect_special_report_delete();

create or replace function public.guard_protect_inspection_log_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  employee_retired_at timestamptz;
begin
  if old.employee_id is null then
    raise exception '퇴사일을 확인할 수 없는 순찰 기록은 삭제할 수 없습니다.';
  end if;

  select retired_at into employee_retired_at
  from public.employees where id = old.employee_id;
  if employee_retired_at is null
    or (now() at time zone 'Asia/Seoul')::date <
      ((employee_retired_at at time zone 'Asia/Seoul')::date + interval '5 years')::date then
    raise exception '퇴사 후 5년 보관기간이 끝나기 전 순찰 기록을 삭제할 수 없습니다.';
  end if;

  return old;
end;
$$;

drop trigger if exists guard_protect_inspection_log_delete on public.inspection_logs;
create trigger guard_protect_inspection_log_delete
before delete on public.inspection_logs
for each row execute function public.guard_protect_inspection_log_delete();

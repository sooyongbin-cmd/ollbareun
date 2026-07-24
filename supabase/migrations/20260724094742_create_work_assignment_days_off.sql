create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists public.work_assignment_days_off (
  id uuid primary key default gen_random_uuid(),
  work_assignment_id uuid not null
    references public.work_assignments(id) on delete cascade,
  day_off_date date not null,
  created_at timestamptz not null default now(),
  constraint work_assignment_days_off_assignment_date_unique
    unique (work_assignment_id, day_off_date)
);

create index if not exists work_assignment_days_off_date_idx
  on public.work_assignment_days_off(day_off_date);

alter table public.work_assignment_days_off enable row level security;

revoke all on table public.work_assignment_days_off from public, anon, authenticated;
grant select, insert, update, delete on table public.work_assignment_days_off to service_role;

create or replace function private.validate_work_assignment_day_off()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_start_date date;
  assignment_end_date date;
begin
  select start_date, end_date
    into assignment_start_date, assignment_end_date
  from public.work_assignments
  where id = new.work_assignment_id;

  if assignment_start_date is null then
    raise exception '배정 정보를 찾을 수 없습니다.'
      using errcode = '23503';
  end if;

  if new.day_off_date < assignment_start_date
    or new.day_off_date > assignment_end_date then
    raise exception '휴무일은 근무기간 안에서만 지정할 수 있습니다.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_work_assignment_day_off() from public, anon, authenticated;

drop trigger if exists validate_work_assignment_day_off
  on public.work_assignment_days_off;
create trigger validate_work_assignment_day_off
before insert or update on public.work_assignment_days_off
for each row execute function private.validate_work_assignment_day_off();

create or replace function private.remove_days_off_outside_assignment_period()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.work_assignment_days_off
  where work_assignment_id = new.id
    and (day_off_date < new.start_date or day_off_date > new.end_date);

  return new;
end;
$$;

revoke all on function private.remove_days_off_outside_assignment_period()
  from public, anon, authenticated;

drop trigger if exists remove_days_off_outside_assignment_period
  on public.work_assignments;
create trigger remove_days_off_outside_assignment_period
after update of start_date, end_date on public.work_assignments
for each row
when (
  old.start_date is distinct from new.start_date
  or old.end_date is distinct from new.end_date
)
execute function private.remove_days_off_outside_assignment_period();

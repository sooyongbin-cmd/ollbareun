create extension if not exists btree_gist;

alter table public.work_assignments
  add column if not exists start_date date,
  add column if not exists end_date date;

update public.work_assignments
set
  start_date = coalesce(start_date, work_date::date),
  end_date = coalesce(end_date, work_date::date)
where work_date is not null;

alter table public.work_assignments
  alter column start_date set not null,
  alter column end_date set not null;

do $$
declare
  constraint_name text;
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.work_assignments'::regclass
      and conname = 'work_assignments_period_order_check'
  ) then
    alter table public.work_assignments
      add constraint work_assignments_period_order_check
      check (start_date <= end_date);
  end if;

  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
      and a.attnum = any(c.conkey)
    where c.conrelid = 'public.work_assignments'::regclass
      and c.contype = 'u'
      and a.attname = 'work_date'
  loop
    execute format('alter table public.work_assignments drop constraint %I', constraint_name);
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.work_assignments'::regclass
      and conname = 'work_assignments_employee_period_no_overlap'
  ) then
    alter table public.work_assignments
      add constraint work_assignments_employee_period_no_overlap
      exclude using gist (
        employee_id with =,
        daterange(start_date, end_date, '[]') with &&
      );
  end if;
end $$;

alter table public.work_assignments
  drop column if exists work_date;

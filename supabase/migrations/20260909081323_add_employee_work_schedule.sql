alter table public.employees
  add column work_style text not null default '1' check (work_style in ('1', '2')),
  add column in_time time without time zone not null default '06:00:00',
  add column out_time time without time zone not null default '06:00:00';

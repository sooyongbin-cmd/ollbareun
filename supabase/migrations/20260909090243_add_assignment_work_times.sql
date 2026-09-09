alter table public.work_assignments
  add column in_time time without time zone,
  add column out_time time without time zone;

update public.work_assignments a
set in_time = e.in_time, out_time = e.out_time
from public.employees e where e.id = a.employee_id;

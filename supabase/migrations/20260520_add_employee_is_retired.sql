alter table public.employees
add column if not exists is_retired boolean not null default false;

update public.employees
set is_retired = false
where is_retired is distinct from false;

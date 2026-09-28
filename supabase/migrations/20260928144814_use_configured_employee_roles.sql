do $$
begin
  if exists (
    select 1
    from public.employees e
    where not exists (
      select 1
      from public.system_configs c
      cross join lateral regexp_split_to_table(c.content, E'\\r?\\n') configured_role
      where c.system_code = 'employees_role'
        and btrim(configured_role) = e.role
    )
  ) then
    raise exception 'employees_role 시스템설정에 없는 기존 직군이 있습니다.';
  end if;
end;
$$;

alter table public.employees
  drop constraint if exists employees_role_check;

create or replace function public.validate_employee_role_from_config()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  configured_roles text[];
begin
  select array_agg(distinct btrim(configured_role))
  into configured_roles
  from public.system_configs c
  cross join lateral regexp_split_to_table(c.content, E'\\r?\\n') configured_role
  where c.system_code = 'employees_role'
    and btrim(configured_role) <> '';

  if configured_roles is null or array_length(configured_roles, 1) is null then
    raise exception '직군 시스템설정에 한 개 이상의 직군을 등록하세요.'
      using errcode = '23514', constraint = 'employees_role_config_check';
  end if;

  if not (new.role = any(configured_roles)) then
    raise exception '등록되지 않은 직군입니다.'
      using errcode = '23514', constraint = 'employees_role_config_check';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_employee_role_from_config() from public, anon, authenticated;
grant execute on function public.validate_employee_role_from_config() to service_role;

drop trigger if exists validate_employee_role_from_config on public.employees;
create trigger validate_employee_role_from_config
before insert or update of role on public.employees
for each row execute function public.validate_employee_role_from_config();

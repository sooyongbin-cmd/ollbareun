alter table public.employees
add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

alter table public.employees
add column if not exists passkey_enabled boolean not null default false;

create unique index if not exists employees_auth_user_id_key
  on public.employees (auth_user_id)
  where auth_user_id is not null;

create index if not exists employees_passkey_enabled_idx
  on public.employees (passkey_enabled);

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create or replace function private.prevent_employee_passkey_column_client_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if tg_op = 'INSERT' then
      if new.auth_user_id is not null or new.passkey_enabled is distinct from false then
        raise exception 'Only server-side service role can set employee passkey columns.';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.auth_user_id is distinct from old.auth_user_id
        or new.passkey_enabled is distinct from old.passkey_enabled then
        raise exception 'Only server-side service role can update employee passkey columns.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_employee_passkey_column_client_write
  on public.employees;

create trigger prevent_employee_passkey_column_client_write
before insert or update on public.employees
for each row
execute function private.prevent_employee_passkey_column_client_write();

create table if not exists public.guard_passkey_requests (
  id uuid not null default gen_random_uuid() primary key,
  employee_id uuid not null references public.employees(id) on delete cascade,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  registered_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guard_passkey_requests_status_check check (
    status in ('pending', 'approved', 'rejected', 'registered', 'revoked')
  ),
  constraint guard_passkey_requests_reviewed_state_check check (
    (status in ('approved', 'rejected') and reviewed_at is not null)
    or status not in ('approved', 'rejected')
  ),
  constraint guard_passkey_requests_registered_state_check check (
    (status = 'registered' and registered_at is not null)
    or status <> 'registered'
  ),
  constraint guard_passkey_requests_revoked_state_check check (
    (status = 'revoked' and revoked_at is not null)
    or status <> 'revoked'
  )
);

create index if not exists guard_passkey_requests_employee_id_idx
  on public.guard_passkey_requests (employee_id);

create index if not exists guard_passkey_requests_status_idx
  on public.guard_passkey_requests (status);

create index if not exists guard_passkey_requests_requested_at_idx
  on public.guard_passkey_requests (requested_at desc);

create unique index if not exists guard_passkey_requests_one_open_request_per_employee_idx
  on public.guard_passkey_requests (employee_id)
  where status in ('pending', 'approved');

alter table public.guard_passkey_requests enable row level security;

revoke all on table public.guard_passkey_requests from anon, authenticated;

grant select, insert, update, delete
on table public.guard_passkey_requests
to service_role;

grant update (auth_user_id, passkey_enabled)
on table public.employees
to service_role;

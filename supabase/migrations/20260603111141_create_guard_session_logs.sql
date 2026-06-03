create table if not exists public.guard_session_logs (
  id uuid not null default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) on delete set null,
  guard_name text not null,
  login_status text not null,
  login_at timestamptz not null default now(),
  login_error text,
  main_push_processed_at timestamptz,
  main_push_status text,
  main_push_result jsonb,
  logout_at timestamptz,
  logout_browser_push_status text,
  logout_server_push_status text,
  logout_session_status text,
  logout_push_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guard_session_logs_login_status_check check (login_status in ('success', 'failed')),
  constraint guard_session_logs_main_push_status_check check (
    main_push_status is null or main_push_status in ('success', 'warning', 'error', 'skipped')
  )
);

create index if not exists guard_session_logs_login_at_idx
  on public.guard_session_logs (login_at desc);

create index if not exists guard_session_logs_employee_id_idx
  on public.guard_session_logs (employee_id);

create index if not exists guard_session_logs_login_status_idx
  on public.guard_session_logs (login_status);

create index if not exists guard_session_logs_guard_name_idx
  on public.guard_session_logs (guard_name);

alter table public.guard_session_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guard_session_logs'
      and policyname = 'guard_session_logs_public_select'
  ) then
    create policy guard_session_logs_public_select
      on public.guard_session_logs
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guard_session_logs'
      and policyname = 'guard_session_logs_public_insert'
  ) then
    create policy guard_session_logs_public_insert
      on public.guard_session_logs
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guard_session_logs'
      and policyname = 'guard_session_logs_public_update'
  ) then
    create policy guard_session_logs_public_update
      on public.guard_session_logs
      for update
      using (true)
      with check (true);
  end if;
end $$;

grant select, insert, update
on public.guard_session_logs
to anon, authenticated;

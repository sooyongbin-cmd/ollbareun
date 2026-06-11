alter table public.inspection_sites
add column if not exists special_remark_flag boolean not null default false;

alter table public.inspection_sites
add column if not exists special_remark_content text;

alter table public.inspection_sites
add column if not exists special_remark_photo_url text;

create table if not exists public.inspection_special_reports (
  id uuid primary key default gen_random_uuid(),
  worksite_id uuid references public.worksites(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null check (btrim(employee_name) <> ''),
  worksite_name text not null check (btrim(worksite_name) <> ''),
  content text not null check (btrim(content) <> ''),
  photo_url text,
  email_to text not null check (btrim(email_to) <> ''),
  email_status text not null default 'pending',
  email_sent_at timestamptz,
  email_error text,
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_special_reports_email_status_check check (
    email_status in ('pending', 'sent', 'failed')
  ),
  constraint inspection_special_reports_email_sent_state_check check (
    (email_status = 'sent' and email_sent_at is not null)
    or email_status <> 'sent'
  )
);

create index if not exists inspection_special_reports_worksite_id_idx
  on public.inspection_special_reports(worksite_id);

create index if not exists inspection_special_reports_employee_id_idx
  on public.inspection_special_reports(employee_id);

create index if not exists inspection_special_reports_reported_at_idx
  on public.inspection_special_reports(reported_at desc);

create index if not exists inspection_special_reports_email_status_idx
  on public.inspection_special_reports(email_status);

alter table public.inspection_special_reports enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inspection_special_reports'
      and policyname = 'inspection_special_reports_public_select'
  ) then
    create policy inspection_special_reports_public_select
      on public.inspection_special_reports
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inspection_special_reports'
      and policyname = 'inspection_special_reports_public_insert'
  ) then
    create policy inspection_special_reports_public_insert
      on public.inspection_special_reports
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inspection_special_reports'
      and policyname = 'inspection_special_reports_public_update'
  ) then
    create policy inspection_special_reports_public_update
      on public.inspection_special_reports
      for update
      using (true)
      with check (true);
  end if;
end $$;

grant select, insert, update
on table public.inspection_special_reports
to anon, authenticated;

create table if not exists public.system_configs (
  system_code text primary key check (btrim(system_code) <> ''),
  parent_system_code text references public.system_configs(system_code) on delete set null,
  content text not null check (btrim(content) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists system_configs_parent_system_code_idx
  on public.system_configs(parent_system_code);

alter table public.system_configs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'system_configs'
      and policyname = 'system_configs_public_select'
  ) then
    create policy system_configs_public_select
      on public.system_configs
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'system_configs'
      and policyname = 'system_configs_public_insert'
  ) then
    create policy system_configs_public_insert
      on public.system_configs
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'system_configs'
      and policyname = 'system_configs_public_update'
  ) then
    create policy system_configs_public_update
      on public.system_configs
      for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'system_configs'
      and policyname = 'system_configs_public_delete'
  ) then
    create policy system_configs_public_delete
      on public.system_configs
      for delete
      using (true);
  end if;
end $$;

grant select, insert, update, delete
on table public.system_configs
to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('special-remarks', 'special-remarks', true)
on conflict (id) do update
set public = excluded.public;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'special_remarks_public_select'
  ) then
    create policy special_remarks_public_select
      on storage.objects
      for select
      using (bucket_id = 'special-remarks');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'special_remarks_public_insert'
  ) then
    create policy special_remarks_public_insert
      on storage.objects
      for insert
      with check (bucket_id = 'special-remarks');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'special_remarks_public_update'
  ) then
    create policy special_remarks_public_update
      on storage.objects
      for update
      using (bucket_id = 'special-remarks')
      with check (bucket_id = 'special-remarks');
  end if;
end $$;

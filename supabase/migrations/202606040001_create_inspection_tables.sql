create table if not exists public.inspection_sites (
  id uuid primary key default gen_random_uuid(),
  worksite_id uuid not null references public.worksites(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  address text not null check (btrim(address) <> ''),
  gps_info jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_sites_gps_info_shape_check check (
    jsonb_typeof(gps_info) = 'object'
    and gps_info ? 'latitude'
    and gps_info ? 'longitude'
    and jsonb_typeof(gps_info -> 'latitude') = 'number'
    and jsonb_typeof(gps_info -> 'longitude') = 'number'
  )
);

create index if not exists inspection_sites_worksite_id_idx on public.inspection_sites(worksite_id);
create index if not exists inspection_sites_name_idx on public.inspection_sites(name);

create table if not exists public.inspection_logs (
  id uuid primary key default gen_random_uuid(),
  inspection_site_id uuid references public.inspection_sites(id) on delete set null,
  worksite_id uuid references public.worksites(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null check (btrim(employee_name) <> ''),
  worksite_name text not null check (btrim(worksite_name) <> ''),
  site_name text not null check (btrim(site_name) <> ''),
  site_gps_info jsonb not null,
  qr_payload jsonb not null,
  inspected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint inspection_logs_site_gps_info_shape_check check (
    jsonb_typeof(site_gps_info) = 'object'
    and site_gps_info ? 'latitude'
    and site_gps_info ? 'longitude'
    and jsonb_typeof(site_gps_info -> 'latitude') = 'number'
    and jsonb_typeof(site_gps_info -> 'longitude') = 'number'
  )
);

create index if not exists inspection_logs_worksite_id_idx on public.inspection_logs(worksite_id);
create index if not exists inspection_logs_inspected_at_idx on public.inspection_logs(inspected_at desc);

alter table public.inspection_sites enable row level security;
alter table public.inspection_logs enable row level security;

drop policy if exists "inspection sites are readable" on public.inspection_sites;
create policy "inspection sites are readable"
  on public.inspection_sites for select
  using (true);

drop policy if exists "inspection sites are insertable" on public.inspection_sites;
create policy "inspection sites are insertable"
  on public.inspection_sites for insert
  with check (true);

drop policy if exists "inspection logs are readable" on public.inspection_logs;
create policy "inspection logs are readable"
  on public.inspection_logs for select
  using (true);

drop policy if exists "inspection logs are insertable" on public.inspection_logs;
create policy "inspection logs are insertable"
  on public.inspection_logs for insert
  with check (true);

grant select, insert on table public.inspection_sites to anon, authenticated;
grant select, insert on table public.inspection_logs to anon, authenticated;

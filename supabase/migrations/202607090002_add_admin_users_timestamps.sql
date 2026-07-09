alter table public.admin_users
add column if not exists created_at timestamptz;

alter table public.admin_users
alter column created_at set default now();

update public.admin_users
set created_at = now()
where created_at is null;

alter table public.admin_users
alter column created_at set not null;

alter table public.admin_users
add column if not exists updated_at timestamptz;

alter table public.admin_users
alter column updated_at set default now();

update public.admin_users
set updated_at = created_at
where updated_at is null;

alter table public.admin_users
alter column updated_at set not null;

create index if not exists admin_users_created_at_idx
  on public.admin_users(created_at desc);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null check (btrim(email) <> ''),
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_role_check check (role in ('admin', 'super_admin'))
);

create index if not exists admin_users_role_idx
  on public.admin_users(role);

alter table public.admin_users enable row level security;

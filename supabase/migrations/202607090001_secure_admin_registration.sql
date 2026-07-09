alter table public.admin_users
add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.admin_users admin_user
set user_id = admin_user.id
where admin_user.user_id is null
  and exists (
    select 1
    from auth.users auth_user
    where auth_user.id = admin_user.id
  );

update public.admin_users
set email = lower(btrim(email))
where email is distinct from lower(btrim(email));

alter table public.admin_users
alter column user_id drop not null;

create unique index if not exists admin_users_user_id_unique_idx
  on public.admin_users(user_id)
  where user_id is not null;

create unique index if not exists admin_users_email_unique_idx
  on public.admin_users (lower(btrim(email)));

alter table public.admin_users
add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.admin_users
add column if not exists first_login_at timestamptz;

create index if not exists admin_users_created_by_idx
  on public.admin_users(created_by);

create index if not exists admin_users_first_login_at_idx
  on public.admin_users(first_login_at);

drop policy if exists system_configs_public_select on public.system_configs;
drop policy if exists system_configs_public_insert on public.system_configs;
drop policy if exists system_configs_public_update on public.system_configs;
drop policy if exists system_configs_public_delete on public.system_configs;

revoke select, insert, update, delete
on table public.system_configs
from anon, authenticated;

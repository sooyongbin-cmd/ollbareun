-- Push subscriptions are written by the guard server route and may also be
-- inserted directly by a Supabase-authenticated passkey user. Keep the table
-- private to server-side code and the owning authenticated employee.

alter table public.push_subscriptions enable row level security;

create or replace function private.is_push_subscription_owner(p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.employees as employee
    where employee.id = p_employee_id
      and employee.auth_user_id = (select auth.uid())
      and employee.is_retired is false
  );
$$;

revoke all on function private.is_push_subscription_owner(uuid) from public, anon, authenticated;
grant execute on function private.is_push_subscription_owner(uuid) to authenticated;

-- Remove the legacy policies that allowed any public client to read or mutate
-- subscription endpoints and encryption keys.
drop policy if exists push_subscriptions_public_select on public.push_subscriptions;
drop policy if exists push_subscriptions_public_insert on public.push_subscriptions;
drop policy if exists push_subscriptions_public_update on public.push_subscriptions;
drop policy if exists push_subscriptions_public_delete on public.push_subscriptions;
drop policy if exists push_subscriptions_authenticated_insert on public.push_subscriptions;

create policy push_subscriptions_authenticated_insert
  on public.push_subscriptions
  for insert
  to authenticated
  with check ((select private.is_push_subscription_owner(employee_id)));

revoke select, insert, update, delete on table public.push_subscriptions from anon;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to service_role;

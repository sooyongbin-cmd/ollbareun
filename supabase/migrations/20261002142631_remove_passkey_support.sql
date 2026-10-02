-- Remove Passkey-only schema support while keeping guard push subscriptions
-- available through the existing service-role API routes.

drop policy if exists push_subscriptions_authenticated_insert
  on public.push_subscriptions;
revoke all on table public.push_subscriptions from authenticated;
drop function if exists private.is_push_subscription_owner(uuid);

drop trigger if exists prevent_employee_passkey_column_client_write
  on public.employees;
drop function if exists private.prevent_employee_passkey_column_client_write();

drop index if exists public.employees_auth_user_id_key;
drop index if exists public.employees_passkey_enabled_idx;

alter table public.employees
  drop column if exists auth_user_id,
  drop column if exists passkey_enabled;

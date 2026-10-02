-- Remove Passkey-only schema support while keeping guard push subscriptions
-- available through the existing service-role API routes.

drop policy if exists push_subscriptions_authenticated_insert
  on public.push_subscriptions;
revoke all on table public.push_subscriptions from authenticated;
drop function if exists private.is_push_subscription_owner(uuid);

drop trigger if exists prevent_employee_passkey_column_client_write
  on public.employees;
drop function if exists private.prevent_employee_passkey_column_client_write();

-- These authenticated-user policies use employees.auth_user_id to link a
-- Supabase Auth user to an employee. Remove them before dropping that column.
drop policy if exists employees_select_self_or_admin
  on public.employees;
drop policy if exists guard_session_logs_select_self_or_admin
  on public.guard_session_logs;
drop policy if exists guard_session_logs_insert_self_or_admin
  on public.guard_session_logs;
drop policy if exists guard_session_logs_update_self_or_admin
  on public.guard_session_logs;
drop policy if exists inspection_logs_select_self_or_admin
  on public.inspection_logs;
drop policy if exists inspection_logs_insert_self_or_admin
  on public.inspection_logs;
drop policy if exists special_reports_select_self_or_admin
  on public.inspection_special_reports;
drop policy if exists special_reports_insert_self_or_admin
  on public.inspection_special_reports;
drop policy if exists special_reports_update_self_or_admin
  on public.inspection_special_reports;
drop policy if exists push_subscriptions_select_self_or_admin
  on public.push_subscriptions;
drop policy if exists push_subscriptions_insert_self_or_admin
  on public.push_subscriptions;
drop policy if exists push_subscriptions_update_self_or_admin
  on public.push_subscriptions;
drop policy if exists push_subscriptions_delete_self_or_admin
  on public.push_subscriptions;
drop policy if exists work_assignments_select_self_or_admin
  on public.work_assignments;

drop index if exists public.employees_auth_user_id_key;
drop index if exists public.employees_passkey_enabled_idx;

alter table public.employees
  drop column if exists auth_user_id,
  drop column if exists passkey_enabled;

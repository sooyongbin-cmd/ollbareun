create table if not exists public.manager_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manager_push_subscriptions_user_endpoint_key unique (user_id, endpoint),
  constraint manager_push_subscriptions_endpoint_key unique (endpoint)
);

create index if not exists manager_push_subscriptions_user_id_idx
  on public.manager_push_subscriptions(user_id);

alter table public.manager_push_subscriptions enable row level security;

revoke all on table public.manager_push_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.manager_push_subscriptions to service_role;

alter table public.inspection_special_reports
drop constraint if exists inspection_special_reports_email_status_check;

alter table public.inspection_special_reports
alter column email_to drop not null;

alter table public.inspection_special_reports
add constraint inspection_special_reports_email_status_check check (
  email_status in ('pending', 'sent', 'failed', 'not_requested')
);

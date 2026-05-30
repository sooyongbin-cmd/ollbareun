-- Create push_subscriptions table to store device subscription information
create table if not exists public.push_subscriptions (
  id uuid not null default gen_random_uuid() primary key,
  employee_id uuid not null references public.employees(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_employee_endpoint_key unique (employee_id, endpoint)
);

create index if not exists push_subscriptions_employee_id_idx
  on public.push_subscriptions (employee_id);

alter table public.push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_public_select'
  ) then
    create policy push_subscriptions_public_select
      on public.push_subscriptions
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_public_insert'
  ) then
    create policy push_subscriptions_public_insert
      on public.push_subscriptions
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_public_update'
  ) then
    create policy push_subscriptions_public_update
      on public.push_subscriptions
      for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_public_delete'
  ) then
    create policy push_subscriptions_public_delete
      on public.push_subscriptions
      for delete
      using (true);
  end if;
end $$;

grant select, insert, update, delete
on public.push_subscriptions
to anon, authenticated;

create table if not exists public.push_notification_runs (
  id uuid primary key default gen_random_uuid(),
  notification_code text not null check (btrim(notification_code) <> ''),
  scheduled_date date not null,
  scheduled_time text not null check (scheduled_time ~ '^\d{2}:\d{2}$'),
  status text not null default 'processing',
  sent_at timestamptz,
  error_message text,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_notification_runs_status_check check (
    status in ('processing', 'sent', 'failed', 'skipped')
  ),
  constraint push_notification_runs_unique_schedule unique (
    notification_code,
    scheduled_date,
    scheduled_time
  )
);

create index if not exists push_notification_runs_created_at_idx
  on public.push_notification_runs(created_at desc);

create index if not exists push_notification_runs_schedule_idx
  on public.push_notification_runs(notification_code, scheduled_date desc, scheduled_time);

alter table public.push_notification_runs enable row level security;

revoke all on table public.push_notification_runs from anon, authenticated;

create or replace function public.prune_push_notification_runs()
returns trigger
language plpgsql
as $$
begin
  delete from public.push_notification_runs
  where id in (
    select id
    from public.push_notification_runs
    order by created_at desc, id desc
    offset 100
  );

  return null;
end;
$$;

revoke all on function public.prune_push_notification_runs() from anon, authenticated;

drop trigger if exists push_notification_runs_prune_after_insert
  on public.push_notification_runs;

create trigger push_notification_runs_prune_after_insert
after insert on public.push_notification_runs
for each statement
execute function public.prune_push_notification_runs();

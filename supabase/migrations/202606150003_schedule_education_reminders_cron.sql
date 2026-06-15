create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;

-- Before applying this migration, create these Vault secrets:
-- select vault.create_secret(
--   'https://<project-ref>.supabase.co/functions/v1/education-reminders',
--   'education_reminders_function_url',
--   'Safety education reminder Edge Function URL'
-- );
-- select vault.create_secret(
--   '<same value as EDUCATION_REMINDER_CRON_SECRET>',
--   'education_reminders_cron_secret',
--   'Safety education reminder cron secret'
-- );

do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'education_reminders_function_url'
  ) then
    raise exception 'Missing Vault secret: education_reminders_function_url';
  end if;

  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'education_reminders_cron_secret'
  ) then
    raise exception 'Missing Vault secret: education_reminders_cron_secret';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'education-reminders'
  ) then
    perform cron.unschedule('education-reminders');
  end if;
end $$;

select cron.schedule(
  'education-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'education_reminders_function_url'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'education_reminders_cron_secret'
      )
    ),
    body := jsonb_build_object(
      'source', 'supabase-cron',
      'job', 'education-reminders'
    ),
    timeout_milliseconds := 30000
  );
  $$
);

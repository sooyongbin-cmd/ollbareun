-- Scheduled reminders now use work_intime + 30 minutes and the reminder job queue.
-- Remove only the obsolete fixed-time setting; retain all other settings and jobs.
-- Refuse deletion if another setting still depends on this code.
do $$
begin
  if exists (
    select 1 from public.system_configs
    where parent_system_code = 'daily_push_message_time'
  ) then
    raise exception 'daily_push_message_time still has child settings';
  end if;

  delete from public.system_configs
  where system_code = 'daily_push_message_time';
end;
$$;

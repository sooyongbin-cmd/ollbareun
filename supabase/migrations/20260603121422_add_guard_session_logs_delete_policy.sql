do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guard_session_logs'
      and policyname = 'guard_session_logs_public_delete'
  ) then
    create policy guard_session_logs_public_delete
      on public.guard_session_logs
      for delete
      using (true);
  end if;
end $$;

grant delete
on public.guard_session_logs
to anon, authenticated;

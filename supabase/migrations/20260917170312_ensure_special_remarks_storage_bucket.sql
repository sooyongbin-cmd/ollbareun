-- The original special remarks migration may already be marked as applied on
-- projects where the storage bucket was not created. Keep this repair
-- migration idempotent so deployed projects converge on the expected state.
insert into storage.buckets (id, name, public)
values ('special-remarks', 'special-remarks', true)
on conflict (id) do update
set public = true;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'special_remarks_public_select'
  ) then
    create policy special_remarks_public_select
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'special-remarks');
  end if;
end $$;

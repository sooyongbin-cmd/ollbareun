alter table public.education_resources
  add column if not exists duration_seconds integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'education_resources_duration_seconds_non_negative'
      and conrelid = 'public.education_resources'::regclass
  ) then
    alter table public.education_resources
      add constraint education_resources_duration_seconds_non_negative
      check (duration_seconds is null or duration_seconds >= 0);
  end if;
end $$;

grant select (id, title, youtube_link, duration_seconds, created_at),
  insert (title, youtube_link, duration_seconds),
  update (title, youtube_link, duration_seconds)
on public.education_resources
to anon, authenticated;

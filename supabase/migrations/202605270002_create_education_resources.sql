create table if not exists public.education_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  youtube_link text not null constraint education_resources_youtube_link_not_blank check (btrim(youtube_link) <> ''),
  created_at timestamptz not null default now()
);

alter table public.education_resources
  add column if not exists youtube_link text;

update public.education_resources
set youtube_link = 'https://www.youtube.com/'
where youtube_link is null;

alter table public.education_resources
  alter column youtube_link set not null,
  drop column if exists file,
  drop column if exists file_name;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'education_resources_youtube_link_not_blank'
      and conrelid = 'public.education_resources'::regclass
  ) then
    alter table public.education_resources
      add constraint education_resources_youtube_link_not_blank
      check (btrim(youtube_link) <> '');
  end if;
end $$;

alter table public.education_resources enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'education_resources'
      and policyname = 'education_resources_public_select'
  ) then
    create policy education_resources_public_select
      on public.education_resources
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'education_resources'
      and policyname = 'education_resources_public_insert'
  ) then
    create policy education_resources_public_insert
      on public.education_resources
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'education_resources'
      and policyname = 'education_resources_public_update'
  ) then
    create policy education_resources_public_update
      on public.education_resources
      for update
      using (true)
      with check (true);
  end if;
end $$;

grant select (id, title, youtube_link, created_at), insert (title, youtube_link), update (title, youtube_link)
on public.education_resources
to anon, authenticated;

create table if not exists public.education_completions (
  employee_id uuid not null references public.employees(id) on delete cascade,
  resource_id uuid not null references public.education_resources(id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  constraint education_completions_employee_resource_key primary key (employee_id, resource_id),
  constraint education_completions_completed_at_check check (
    (is_completed = false and completed_at is null)
    or (is_completed = true and completed_at is not null)
  )
);

create index if not exists education_completions_employee_id_idx
  on public.education_completions (employee_id);

create index if not exists education_completions_resource_id_idx
  on public.education_completions (resource_id);

create index if not exists education_completions_is_completed_idx
  on public.education_completions (is_completed);

alter table public.education_completions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'education_completions'
      and policyname = 'education_completions_public_select'
  ) then
    create policy education_completions_public_select
      on public.education_completions
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'education_completions'
      and policyname = 'education_completions_public_insert'
  ) then
    create policy education_completions_public_insert
      on public.education_completions
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'education_completions'
      and policyname = 'education_completions_public_update'
  ) then
    create policy education_completions_public_update
      on public.education_completions
      for update
      using (true)
      with check (true);
  end if;
end $$;

grant select (employee_id, resource_id, is_completed, completed_at),
  insert (employee_id, resource_id, is_completed, completed_at),
  update (employee_id, resource_id, is_completed, completed_at)
on public.education_completions
to anon, authenticated;

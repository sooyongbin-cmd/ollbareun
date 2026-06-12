drop policy if exists "inspection sites are updatable" on public.inspection_sites;
create policy "inspection sites are updatable"
  on public.inspection_sites for update
  using (true)
  with check (true);

drop policy if exists "inspection sites are deletable" on public.inspection_sites;
create policy "inspection sites are deletable"
  on public.inspection_sites for delete
  using (true);

grant update, delete on table public.inspection_sites to anon, authenticated;

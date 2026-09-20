alter table public.inspection_special_reports
  add column if not exists photo_urls jsonb not null default '[]'::jsonb;

update public.inspection_special_reports
set photo_urls = jsonb_build_array(photo_url)
where photo_url is not null
  and photo_urls = '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inspection_special_reports'::regclass
      and conname = 'inspection_special_reports_photo_urls_array_check'
  ) then
    alter table public.inspection_special_reports
      add constraint inspection_special_reports_photo_urls_array_check
      check (jsonb_typeof(photo_urls) = 'array');
  end if;
end $$;

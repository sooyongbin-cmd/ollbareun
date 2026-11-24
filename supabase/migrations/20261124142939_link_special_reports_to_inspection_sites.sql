alter table public.inspection_special_reports
  add column inspection_site_id uuid references public.inspection_sites(id) on delete set null;

with unique_sites as (
  select worksite_id, name, (array_agg(id))[1] as id
  from public.inspection_sites
  group by worksite_id, name
  having count(*) = 1
)
update public.inspection_special_reports as report
set inspection_site_id = site.id
from unique_sites as site
where report.worksite_id = site.worksite_id and report.site_name = site.name;

alter table public.inspection_sites
add column if not exists sort_order integer;

with numbered_sites as (
  select
    id,
    row_number() over (
      partition by worksite_id
      order by created_at asc, id asc
    )::integer as sort_order
  from public.inspection_sites
)
update public.inspection_sites as sites
set sort_order = numbered_sites.sort_order
from numbered_sites
where sites.id = numbered_sites.id
  and sites.sort_order is null;

alter table public.inspection_sites
alter column sort_order set not null;

alter table public.inspection_sites
add constraint inspection_sites_sort_order_positive_check
check (sort_order > 0);

create index if not exists inspection_sites_worksite_sort_order_idx
  on public.inspection_sites(worksite_id, sort_order);

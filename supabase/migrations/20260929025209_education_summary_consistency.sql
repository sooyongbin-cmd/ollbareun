-- Count today's effective category, including snapshots from before a same-day resource edit.
create or replace function public.education_resource_completion_counts()
returns table(resource_id uuid,completed_count bigint)
language sql stable security invoker set search_path = '' as $$
  select r.id,count(distinct c.employee_id)
  from public.education_resources r
  left join public.current_completed_education() c on c.resource_id=r.id
    and exists(select 1 from public.employees e where e.id=c.employee_id and not e.is_retired)
  group by r.id;
$$;

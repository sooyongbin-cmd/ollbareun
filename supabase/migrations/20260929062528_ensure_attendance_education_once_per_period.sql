create or replace function public.ensure_attendance_education(p_employee_id uuid,p_date date)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_employee_id is null or p_date is null then raise exception '직원과 출근일이 필요합니다.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_employee_id::text,0));
  insert into public.education_completions(employee_id,resource_id,education_date,education_type)
  select p_employee_id,r.id,p_date,r.education_type from public.education_resources r
  where (r.created_at at time zone 'Asia/Seoul')::date <= p_date
    -- Monthly, quarterly, and semiannual resources are generated once per employee and period, even while pending.
    and (r.education_type='daily' or not exists (
      select 1 from public.education_completions c
      where c.employee_id=p_employee_id and c.resource_id=r.id and c.education_type=r.education_type
        and c.education_date >= public.education_period_start(r.education_type,p_date)
        and c.education_date < (
          public.education_period_start(r.education_type,p_date) + case r.education_type
            when 'monthly' then interval '1 month'
            when 'quarterly' then interval '3 months'
            when 'semiannual' then interval '6 months'
            else interval '1 day'
          end
        )::date
    ))
  on conflict (employee_id,resource_id,education_date) do nothing;
end;
$$;

alter table public.education_resources
  add column education_type text not null default 'daily'
  check (education_type in ('daily','monthly','quarterly','semiannual'));

alter table public.education_completions
  add column id uuid not null default gen_random_uuid(),
  add column education_date date,
  add column education_type text not null default 'daily'
    check (education_type in ('daily','monthly','quarterly','semiannual'));
update public.education_completions
set education_date = (completed_at at time zone 'Asia/Seoul')::date
where completed_at is not null;
alter table public.education_completions
  drop constraint education_completions_employee_resource_key,
  add primary key (id),
  add constraint education_completions_employee_resource_date_key unique (employee_id,resource_id,education_date);
create index education_completions_date_employee_idx on public.education_completions(education_date,employee_id);
create index education_completions_period_idx
  on public.education_completions(employee_id,resource_id,education_type,completed_at) where is_completed;
comment on column public.education_completions.education_date is '교육 대상일 (한국시간). 기존 미이수 자료만 날짜 미상(NULL).';
comment on column public.education_completions.education_type is '교육 대상 생성 당시 구분';

-- Guard sessions are checked by server routes, never by anonymous database writes.
drop policy if exists education_completions_public_select on public.education_completions;
drop policy if exists education_completions_public_insert on public.education_completions;
drop policy if exists education_completions_public_update on public.education_completions;
revoke all on public.education_completions from anon;
revoke select(employee_id,resource_id,is_completed,completed_at),
  insert(employee_id,resource_id,is_completed,completed_at),
  update(employee_id,resource_id,is_completed,completed_at) on public.education_completions from anon;

create function public.education_period_start(p_type text, p_date date)
returns date language sql immutable strict security invoker set search_path = '' as $$
  select case p_type
    when 'daily' then p_date
    when 'monthly' then date_trunc('month',p_date::timestamp)::date
    when 'quarterly' then date_trunc('quarter',p_date::timestamp)::date
    when 'semiannual' then make_date(extract(year from p_date)::int,case when extract(month from p_date)<=6 then 1 else 7 end,1)
  end;
$$;

create function public.ensure_attendance_education(p_employee_id uuid,p_date date)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_employee_id is null or p_date is null then raise exception '직원과 출근일이 필요합니다.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_employee_id::text,0));
  insert into public.education_completions(employee_id,resource_id,education_date,education_type)
  select p_employee_id,r.id,p_date,r.education_type from public.education_resources r
  where (r.created_at at time zone 'Asia/Seoul')::date <= p_date
    and (r.education_type='daily' or not exists (
      select 1 from public.education_completions c
      where c.employee_id=p_employee_id and c.resource_id=r.id and c.education_type=r.education_type
        and c.is_completed
        and c.completed_at >= (public.education_period_start(r.education_type,p_date)::timestamp at time zone 'Asia/Seoul')
        and c.completed_at < ((p_date+1)::timestamp at time zone 'Asia/Seoul')
    ))
  on conflict (employee_id,resource_id,education_date) do nothing;
end;
$$;

create function public.save_attendance_with_education(p_record_id uuid,p_values jsonb,p_guard_clock_in boolean default false)
returns public.work_record language plpgsql security invoker set search_path = '' as $$
declare
  v_old public.work_record;
  v_saved public.work_record;
  v_employee uuid;
  v_in timestamptz;
  v_out timestamptz;
begin
  if p_record_id is not null then
    select employee_id into v_employee from public.work_record where id=p_record_id;
    if not found then raise exception '근태 기록을 확인할 수 없습니다.'; end if;
  else
    v_employee := (p_values->>'employee_id')::uuid;
  end if;
  if v_employee is null then raise exception '직원을 확인할 수 없습니다.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_employee::text,0));
  if p_record_id is not null then
    select * into v_old from public.work_record where id=p_record_id for update;
    if not found then raise exception '근태 기록을 확인할 수 없습니다.'; end if;
    if p_guard_clock_in and v_old.work_intime is not null then raise exception '이미 출근 처리되었습니다.'; end if;
    v_in := case when p_values ? 'work_intime' then (p_values->>'work_intime')::timestamptz else v_old.work_intime end;
    v_out := case when p_values ? 'work_outtime' then (p_values->>'work_outtime')::timestamptz else v_old.work_outtime end;
    if v_out is not null and (v_in is null or v_out < v_in) then raise exception '퇴근일시는 출근일시 이후여야 합니다.'; end if;
    update public.work_record set
      work_date=case when p_values ? 'work_intime' then (v_in at time zone 'Asia/Seoul')::date else work_date end,
      work_intime=v_in, work_outtime=v_out,
      intime_status=case when v_in is null then '0' when intime is not null and v_in>intime then '1' else '2' end,
      outtime_status=case when v_out is null then '0' when outtime is not null and v_out<outtime then '1' else '2' end,
      clock_in_latitude=case when p_values ? 'clock_in_latitude' then (p_values->>'clock_in_latitude')::float8 else clock_in_latitude end,
      clock_in_longitude=case when p_values ? 'clock_in_longitude' then (p_values->>'clock_in_longitude')::float8 else clock_in_longitude end,
      updated_at=now()
    where id=p_record_id returning * into v_saved;
  else
    if not p_guard_clock_in then raise exception '근태 기록 ID가 필요합니다.'; end if;
    v_in := (p_values->>'work_intime')::timestamptz;
    if v_in is null then raise exception '출근일시가 필요합니다.'; end if;
    insert into public.work_record(employee_id,worksite_id,work_date,work_intime,intime_status,outtime_status,clock_in_latitude,clock_in_longitude)
    values(v_employee,(p_values->>'worksite_id')::uuid,(v_in at time zone 'Asia/Seoul')::date,v_in,'2','0',
      (p_values->>'clock_in_latitude')::float8,(p_values->>'clock_in_longitude')::float8)
    returning * into v_saved;
  end if;
  if p_values ? 'work_intime' and v_saved.work_intime is not null then
    perform public.ensure_attendance_education(v_saved.employee_id,(v_saved.work_intime at time zone 'Asia/Seoul')::date);
  end if;
  return v_saved;
end;
$$;

create function public.complete_education(p_employee_id uuid,p_resource_id uuid)
returns public.education_completions language plpgsql security invoker set search_path = '' as $$
declare v_type text; v_now timestamptz; v_day date; v_result public.education_completions;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_employee_id::text,0));
  v_now := clock_timestamp();
  v_day := (v_now at time zone 'Asia/Seoul')::date;
  select education_type into strict v_type from public.education_resources where id=p_resource_id;
  insert into public.education_completions(employee_id,resource_id,education_date,education_type,is_completed,completed_at)
  values(p_employee_id,p_resource_id,v_day,v_type,true,v_now)
  on conflict (employee_id,resource_id,education_date) do update
    set is_completed=true,completed_at=coalesce(education_completions.completed_at,excluded.completed_at)
  returning * into v_result;
  return v_result;
end;
$$;

create function public.current_education_status(p_employee_id uuid,p_date date default (now() at time zone 'Asia/Seoul')::date)
returns table(id uuid,employee_id uuid,resource_id uuid,resource_title text,resource_youtube_link text,
  education_date date,education_type text,is_completed boolean,completed_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select coalesce(done.id,today.id),p_employee_id,r.id,r.title,r.youtube_link,p_date,
    coalesce(today.education_type,r.education_type),done.id is not null,done.completed_at
  from public.education_resources r
  left join public.education_completions today on today.employee_id=p_employee_id and today.resource_id=r.id and today.education_date=p_date
  left join lateral (
    select c.id,c.completed_at from public.education_completions c
    where c.employee_id=p_employee_id and c.resource_id=r.id and c.is_completed
      and c.education_type=coalesce(today.education_type,r.education_type)
      and c.completed_at >= (public.education_period_start(coalesce(today.education_type,r.education_type),p_date)::timestamp at time zone 'Asia/Seoul')
      and c.completed_at < ((p_date+1)::timestamp at time zone 'Asia/Seoul')
    order by c.completed_at desc limit 1
  ) done on true
  where (r.created_at at time zone 'Asia/Seoul')::date <= p_date
  order by r.title,r.id;
$$;

create function public.education_completion_days(p_name text default '',p_from date default null,p_to date default null,
  p_type text default null,p_offset integer default 0,p_limit integer default 50)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with grouped as (
    select c.employee_id,e.name as employee_name,c.education_date,
      jsonb_agg(jsonb_build_object('id',c.id,'resource_id',c.resource_id,'resource_title',r.title,
        'education_type',c.education_type,'is_completed',c.is_completed,'completed_at',c.completed_at) order by r.title,c.id) as items
    from public.education_completions c join public.employees e on e.id=c.employee_id
    join public.education_resources r on r.id=c.resource_id
    where (p_name='' or strpos(lower(e.name),lower(p_name))>0)
      and (p_from is null or c.education_date>=p_from) and (p_to is null or c.education_date<=p_to)
      and (p_type is null or c.education_type=p_type)
    group by c.employee_id,e.name,c.education_date
  ), paged as (
    select * from grouped order by education_date desc nulls last,employee_name,employee_id
    offset greatest(p_offset,0) limit least(greatest(p_limit,1),100)
  ) select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb),'total',(select count(*) from grouped));
$$;

create function public.education_resource_completion_counts()
returns table(resource_id uuid,completed_count bigint) language sql stable security invoker set search_path = '' as $$
  select r.id,count(distinct c.employee_id)
  from public.education_resources r left join public.education_completions c
    on c.resource_id=r.id and c.education_type=r.education_type and c.is_completed
    and c.completed_at >= (public.education_period_start(r.education_type,(now() at time zone 'Asia/Seoul')::date)::timestamp at time zone 'Asia/Seoul')
    and c.completed_at <= now()
    and exists (select 1 from public.employees e where e.id=c.employee_id and not e.is_retired)
  group by r.id;
$$;

create function public.current_completed_education()
returns setof public.education_completions language sql stable security invoker set search_path = '' as $$
  select distinct on (c.employee_id,c.resource_id) c.*
  from public.education_completions c join public.education_resources r on r.id=c.resource_id
  left join public.education_completions today on today.employee_id=c.employee_id and today.resource_id=c.resource_id
    and today.education_date=(now() at time zone 'Asia/Seoul')::date
  where c.is_completed and c.education_type=coalesce(today.education_type,r.education_type)
    and c.completed_at >= (public.education_period_start(coalesce(today.education_type,r.education_type),(now() at time zone 'Asia/Seoul')::date)::timestamp at time zone 'Asia/Seoul')
    and c.completed_at <= now()
  order by c.employee_id,c.resource_id,c.completed_at desc;
$$;

revoke all on function public.education_period_start(text,date) from public,anon,authenticated;
revoke all on function public.ensure_attendance_education(uuid,date) from public,anon,authenticated;
revoke all on function public.save_attendance_with_education(uuid,jsonb,boolean) from public,anon,authenticated;
revoke all on function public.complete_education(uuid,uuid) from public,anon,authenticated;
revoke all on function public.current_education_status(uuid,date) from public,anon,authenticated;
revoke all on function public.education_completion_days(text,date,date,text,integer,integer) from public,anon,authenticated;
revoke all on function public.education_resource_completion_counts() from public,anon,authenticated;
revoke all on function public.current_completed_education() from public,anon,authenticated;
grant execute on function public.education_period_start(text,date),public.ensure_attendance_education(uuid,date),
  public.save_attendance_with_education(uuid,jsonb,boolean),public.complete_education(uuid,uuid),
  public.current_education_status(uuid,date),public.education_completion_days(text,date,date,text,integer,integer),
  public.education_resource_completion_counts(),public.current_completed_education() to service_role;

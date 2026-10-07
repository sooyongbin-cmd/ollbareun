-- Synthetic fixtures and row deletion are completely rolled back.
-- No storage objects or actual annual records are deleted by this test.
begin;
-- Exercise protections even if the environment has disabled its triggers.
-- Their original enabled/disabled state is restored by the final rollback.
alter table public.work_record enable trigger guard_protect_work_record_delete;
alter table public.inspection_logs enable trigger guard_protect_inspection_log_delete;
set local role service_role;
do $$
declare
  employee uuid;
  worksite uuid;
  manifest jsonb;
  counts jsonb;
  deleted jsonb;
  key text;
  yr integer;
begin
  select id into employee from public.employees where retired_at is null limit 1;
  select id into worksite from public.worksites limit 1;
  if employee is null or worksite is null then raise exception 'Employee and worksite test fixtures required'; end if;
  if exists(select 1 from public.list_data_management_years() where year in (8998, 8999)) then raise exception 'Fixture years already exist'; end if;
  for yr in 8998..8999 loop
    insert into public.work_record(employee_id,worksite_id,work_date,work_intime) values(employee,worksite,make_date(yr,1,1),make_date(yr,1,1)::timestamp at time zone 'Asia/Seoul');
    insert into public.leave(employee_id,leave_type,start_date,end_date) values(employee,'2',make_date(yr,12,30),make_date(yr+1,1,2));
    insert into public.public_holidays(holiday_date,name) values(make_date(yr,1,1),'annual-cleanup-test');
    insert into public.education_completions(employee_id,work_date,title) values(employee,make_date(yr,1,1),'annual-cleanup-test');
    insert into public.inspection_logs(employee_id,employee_name,worksite_name,site_name,site_gps_info,qr_payload,inspected_at)
      values(employee,'test','test','test','{"latitude":37,"longitude":127}','{}',make_date(yr,1,1)::timestamp at time zone 'Asia/Seoul');
    insert into public.inspection_special_reports(employee_id,employee_name,worksite_name,content,reported_at)
      values(employee,'test','test','test',make_date(yr,1,1)::timestamp at time zone 'Asia/Seoul');
  end loop;
  counts := public.get_year_data_counts(8998);
  for key in select jsonb_object_keys(counts) loop
    if (counts->>key)::integer <> 1 then raise exception 'Count mismatch for %: %', key, counts; end if;
  end loop;
  -- A stale photo manifest must stop every table deletion.
  begin
    perform public.delete_year_data(8998,'[]');
    raise exception 'Stale manifest unexpectedly accepted';
  exception when others then
    if sqlerrm not like '특이사항 자료가 변경되었습니다.%' then raise; end if;
  end;
  if public.get_year_data_counts(8998) <> counts then raise exception 'Failed delete changed records'; end if;
  select jsonb_agg(jsonb_build_object('id',id,'photo_url',photo_url,'photo_urls',photo_urls)) into manifest
    from public.inspection_special_reports where reported_at >= '8998-01-01 00:00:00+09' and reported_at < '8999-01-01 00:00:00+09';
  deleted := public.delete_year_data(8998,manifest);
  if deleted <> counts then raise exception 'Deleted counts differ from displayed counts'; end if;
  for key in select jsonb_object_keys(counts) loop
    if (public.get_year_data_counts(8998)->>key)::integer <> 0 then raise exception 'Target year remains'; end if;
    if (public.get_year_data_counts(8999)->>key)::integer <> 1 then raise exception 'Other year affected'; end if;
  end loop;
  if exists(select 1 from public.education_reminder_jobs where work_date='8998-01-01') then raise exception 'Attendance queue not removed'; end if;
  if coalesce(current_setting('app.data_manage_year',true),'') <> '' then raise exception 'Retention bypass leaked'; end if;
  begin
    delete from public.work_record where work_date='8999-01-01';
    raise exception 'Normal retention bypassed';
  exception when others then
    if sqlerrm <> '보관기간이 끝나지 않은 근무기록은 삭제할 수 없습니다.' then raise; end if;
  end;
  begin
    delete from public.inspection_logs where inspected_at >= '8999-01-01 00:00:00+09' and inspected_at < '9000-01-01 00:00:00+09';
    raise exception 'Normal inspection retention bypassed';
  exception when others then
    if sqlerrm <> '퇴사 후 5년 보관기간이 끝나기 전 순찰 기록을 삭제할 수 없습니다.' then raise; end if;
  end;
  if has_function_privilege('anon','public.delete_year_data(integer,jsonb)','execute')
    or has_function_privilege('authenticated','public.delete_year_data(integer,jsonb)','execute') then raise exception 'Untrusted role can delete'; end if;
end;
$$;
rollback;

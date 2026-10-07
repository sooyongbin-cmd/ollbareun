begin;
set local role service_role;
do $$
declare
  first_id uuid;
  second_id uuid;
  employee uuid;
begin
  insert into public.education_resources(title,youtube_link,education_type,startdate,enddate)
    values('date-range-test-1','https://youtu.be/test','기타','2026-10-07','2026-10-31') returning id into first_id;
  insert into public.education_resources(title,youtube_link,education_type,startdate,enddate)
    values('date-range-test-2','https://youtu.be/test','기타','2026-10-07','2026-10-31') returning id into second_id;
  if first_id = second_id then raise exception 'Duplicate category was not created'; end if;
  update public.education_resources set education_type='일일',startdate='2026-10-08' where id=first_id;
  begin
    update public.education_resources set enddate='2026-10-01' where id=first_id;
    raise exception 'Invalid date range accepted';
  exception when check_violation then null;
  end;
  begin
    update public.education_resources set startdate=null where id=first_id;
    raise exception 'Missing date accepted';
  exception when not_null_violation then null;
  end;
  select id into employee from public.employees limit 1;
  if employee is not null then
    insert into public.education_completions(employee_id,title,education_type,work_date,completed_at)
      values(employee,'date-range-test-2','기타','2026-10-07',now());
  end if;
  if obj_description('public.education_resources'::regclass) <> '교육자료' then raise exception 'Table comment differs'; end if;
end;
$$;
rollback;

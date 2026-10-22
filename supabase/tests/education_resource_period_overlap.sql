begin;
set local role service_role;
-- Use far-future fixtures; all writes are rolled back below.
do $$
declare
  first_id uuid;
  second_id uuid;
  different_type_id uuid;
begin
  insert into public.education_resources(title,youtube_link,education_type,startdate,enddate)
    values('overlap-test-first','https://youtu.be/test','일일','9000-10-07','9000-10-31') returning id into first_id;
  -- An unchanged range must not conflict with its own row.
  update public.education_resources set startdate='9000-10-07', enddate='9000-10-31' where id=first_id;
  -- The next day and another category are allowed.
  insert into public.education_resources(title,youtube_link,education_type,startdate,enddate)
    values('overlap-test-next','https://youtu.be/test','일일','9000-11-01','9000-11-30') returning id into second_id;
  insert into public.education_resources(title,youtube_link,education_type,startdate,enddate)
    values('overlap-test-other','https://youtu.be/test','기타','9000-10-07','9000-10-31') returning id into different_type_id;
  begin
    insert into public.education_resources(title,youtube_link,education_type,startdate,enddate)
      values('overlap-test-boundary','https://youtu.be/test','일일','9000-10-31','9000-10-31');
    raise exception 'Shared boundary date was accepted';
  exception when exclusion_violation then null;
  end;
  begin
    insert into public.education_resources(title,youtube_link,education_type,startdate,enddate)
      values('overlap-test-contained','https://youtu.be/test','일일','9000-10-10','9000-10-15');
    raise exception 'Contained date range was accepted';
  exception when exclusion_violation then null;
  end;
  begin
    insert into public.education_resources(title,youtube_link,education_type,startdate,enddate)
      values('overlap-test-containing','https://youtu.be/test','일일','9000-10-01','9000-12-01');
    raise exception 'Containing date range was accepted';
  exception when exclusion_violation then null;
  end;
  begin
    update public.education_resources set startdate='9000-10-31' where id=second_id;
    raise exception 'Overlapping update was accepted';
  exception when exclusion_violation then null;
  end;
  begin
    update public.education_resources set education_type='일일' where id=different_type_id;
    raise exception 'Overlapping category change was accepted';
  exception when exclusion_violation then null;
  end;
end;
$$;
rollback;

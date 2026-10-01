-- Table-only regression checks. All fixture writes are rolled back.
begin;
do $$
declare
  v_employee uuid := gen_random_uuid();
  v_resource uuid;
  v_type text;
  v_rejected boolean;
begin
  assert not exists (
    select 1 from information_schema.columns where table_schema='public'
      and table_name='education_completions'
      and column_name in ('resource_id','is_completed','education_date')
  ), 'old completion columns must be removed';
  assert exists (
    select 1 from information_schema.columns where table_schema='public'
      and table_name='education_completions' and column_name='work_date' and data_type='date'
  ), 'work_date must be a date';
  assert exists (
    select 1 from information_schema.columns where table_schema='public'
      and table_name='education_completions' and column_name='title' and data_type='text'
  ), 'title must be text';
  assert not exists (select 1 from public.education_resources where education_type not in ('월간','일일','반기','분기'));
  assert not exists (select 1 from public.education_completions where education_type not in ('월간','일일','반기','분기'));

  insert into public.employees(id,name,phone,phone_normalized)
    values(v_employee,'education-schema-test',v_employee::text,v_employee::text);
  insert into public.education_resources(title,youtube_link)
    values('교육 스키마 검증','https://youtu.be/test') returning id,education_type into v_resource,v_type;
  assert v_type='일일', 'resource default must be Korean';
  insert into public.education_completions(employee_id,work_date,title)
    values(v_employee,date '2026-10-01','교육 스키마 검증') returning education_type into v_type;
  assert v_type='일일', 'completion default must be Korean';

  foreach v_type in array array['월간','일일','반기','분기'] loop
    update public.education_resources set education_type=v_type where id=v_resource;
    update public.education_completions set education_type=v_type where employee_id=v_employee;
  end loop;
  foreach v_type in array array['monthly','daily','semiannual','quarterly'] loop
    v_rejected := false;
    begin
      update public.education_resources set education_type=v_type where id=v_resource;
    exception when check_violation then v_rejected := true;
    end;
    assert v_rejected, 'resource check must reject English values';
    v_rejected := false;
    begin
      update public.education_completions set education_type=v_type where employee_id=v_employee;
    exception when check_violation then v_rejected := true;
    end;
    assert v_rejected, 'completion check must reject English values';
  end loop;
  assert (select relrowsecurity from pg_class where oid='public.education_resources'::regclass);
  assert (select relrowsecurity from pg_class where oid='public.education_completions'::regclass);
end $$;
rollback;
select 'Korean education table schema checks passed; all fixture writes rolled back' as result;

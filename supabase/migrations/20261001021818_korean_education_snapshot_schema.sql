-- Table-only change requested by the user. Existing RPC definitions stay unchanged.
-- RPCs referencing the removed columns require a separate application/DB-function update.
lock table public.education_resources, public.education_completions in access exclusive mode;

-- Capture the expected migrated values and verify preservation before committing.
create temporary table education_schema_expected on commit drop as
select c.id, c.employee_id, c.completed_at, c.education_date as work_date, r.title,
  case c.education_type
    when 'monthly' then '월간' when 'daily' then '일일'
    when 'semiannual' then '반기' when 'quarterly' then '분기'
    else c.education_type
  end as education_type
from public.education_completions c
left join public.education_resources r on r.id=c.resource_id;

alter table public.education_resources
  drop constraint education_resources_education_type_check;
alter table public.education_completions
  drop constraint education_completions_education_type_check;

update public.education_resources set education_type=case education_type
  when 'monthly' then '월간' when 'daily' then '일일'
  when 'semiannual' then '반기' when 'quarterly' then '분기'
  else education_type end;
update public.education_completions set education_type=case education_type
  when 'monthly' then '월간' when 'daily' then '일일'
  when 'semiannual' then '반기' when 'quarterly' then '분기'
  else education_type end;

alter table public.education_resources
  alter column education_type set default '일일',
  add constraint education_resources_education_type_check
    check (education_type in ('월간','일일','반기','분기'));
alter table public.education_completions
  alter column education_type set default '일일',
  add constraint education_completions_education_type_check
    check (education_type in ('월간','일일','반기','분기')),
  add column title text;

update public.education_completions c set title=r.title
from public.education_resources r where r.id=c.resource_id;

-- Renaming preserves every original date and the existing date/employee index.
alter table public.education_completions rename column education_date to work_date;
alter index public.education_completions_date_employee_idx rename to education_completions_work_date_employee_idx;

-- PostgreSQL removes constraints and indexes on these columns automatically.
-- No CASCADE: unrelated dependent objects must not be silently removed.
alter table public.education_completions
  drop column resource_id,
  drop column is_completed;

comment on column public.education_completions.work_date is '근무일. 기존 education_date 값을 보존하여 전환함.';
comment on column public.education_completions.title is '안전교육 제목. 기존 자료는 연결된 education_resources.title 값을 복사함.';
comment on column public.education_completions.education_type is '교육구분: 월간, 일일, 반기, 분기';
comment on column public.education_resources.education_type is '교육구분: 월간, 일일, 반기, 분기';

do $$
begin
  if exists (
    (select id,employee_id,completed_at,work_date,title,education_type from education_schema_expected
     except all
     select id,employee_id,completed_at,work_date,title,education_type from public.education_completions)
    union all
    (select id,employee_id,completed_at,work_date,title,education_type from public.education_completions
     except all
     select id,employee_id,completed_at,work_date,title,education_type from education_schema_expected)
  ) then
    raise exception '교육이수 자료의 날짜, 제목, 완료시각 또는 행 보존 검증에 실패했습니다.';
  end if;
end $$;

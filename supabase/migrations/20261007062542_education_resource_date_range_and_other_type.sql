alter table public.education_resources add column startdate date;
alter table public.education_resources add column enddate date;
-- Existing resources use the user's requested Korea date, independent of deploy time.
update public.education_resources set startdate = date '2026-10-07', enddate = date '2026-10-07';
alter table public.education_resources alter column startdate set not null;
alter table public.education_resources alter column enddate set not null;
alter table public.education_resources add constraint education_resources_date_range_check check (startdate <= enddate);
comment on table public.education_resources is '교육자료';
comment on column public.education_resources.startdate is '시작일';
comment on column public.education_resources.enddate is '종료일';
alter table public.education_resources drop constraint education_resources_education_type_check;
alter table public.education_resources add constraint education_resources_education_type_check
  check (education_type in ('일일', '월간', '분기', '반기', '기타'));
alter table public.education_completions drop constraint education_completions_education_type_check;
alter table public.education_completions add constraint education_completions_education_type_check
  check (education_type in ('일일', '월간', '분기', '반기', '기타'));

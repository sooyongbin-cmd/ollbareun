alter table public.education_resources
  drop constraint if exists education_resources_duration_seconds_non_negative,
  drop column if exists duration_seconds;

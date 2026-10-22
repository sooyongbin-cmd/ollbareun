-- Enforce inclusive date ranges per education category for inserts and updates,
-- including concurrent requests. Different categories may share the same dates.
create extension if not exists btree_gist with schema extensions;

alter table public.education_resources
  add constraint education_resources_type_period_excl
  exclude using gist (
    education_type extensions.gist_text_ops with =,
    daterange(startdate, enddate, '[]') with &&
  );

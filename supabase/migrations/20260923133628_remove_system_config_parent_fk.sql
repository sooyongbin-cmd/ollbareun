-- The manager UI uses this field as a free-form category, not a self-reference.
alter table public.system_configs
drop constraint if exists system_configs_parent_system_code_fkey;

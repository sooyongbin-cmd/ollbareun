alter table public.worksites
add column if not exists gps_info jsonb;

update public.worksites
set gps_info = jsonb_build_object('latitude', latitude, 'longitude', longitude)
where gps_info is null
  and latitude is not null
  and longitude is not null;

alter table public.worksites
alter column gps_info set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.worksites'::regclass
      and conname = 'worksites_gps_info_shape_check'
  ) then
    alter table public.worksites
    add constraint worksites_gps_info_shape_check
    check (
      jsonb_typeof(gps_info) = 'object'
      and gps_info ? 'latitude'
      and gps_info ? 'longitude'
      and jsonb_typeof(gps_info->'latitude') = 'number'
      and jsonb_typeof(gps_info->'longitude') = 'number'
    );
  end if;
end $$;

alter table public.worksites
drop column if exists latitude,
drop column if exists longitude;

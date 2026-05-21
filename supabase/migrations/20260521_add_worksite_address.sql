alter table public.worksites
add column if not exists address text not null default '';

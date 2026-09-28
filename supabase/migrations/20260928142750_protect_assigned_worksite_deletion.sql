alter table public.work_assignments
  drop constraint work_assignments_worksite_id_fkey;

alter table public.work_assignments
  add constraint work_assignments_worksite_id_fkey
  foreign key (worksite_id) references public.worksites(id) on delete restrict;

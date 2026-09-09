alter table public.inspection_special_reports
  add column processing_status text not null default 'N'
  constraint inspection_special_reports_processing_status_check
  check (processing_status in ('Y', 'N'));

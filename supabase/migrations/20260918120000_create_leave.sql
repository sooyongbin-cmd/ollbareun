create table public.leave (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_type_check check (leave_type in ('1', '2')),
  constraint leave_date_range_check check (start_date <= end_date)
);

comment on table public.leave is '직원별 휴가 신청 및 기간 정보';
comment on column public.leave.leave_type is '휴가종류: 1 월차, 2 연차';

create index leave_employee_id_idx on public.leave (employee_id);
create index leave_period_idx on public.leave (start_date, end_date);

alter table public.leave enable row level security;
revoke all on public.leave from public, anon, authenticated;
grant select, insert, update, delete on public.leave to service_role;

create table public.public_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text,
  selected text not null default 'Y' check (selected in ('Y', 'N')),
  created_at timestamptz not null default now()
);
comment on table public.public_holidays is '공휴일 및 관리자가 추가한 휴일';
comment on column public.public_holidays.selected is '선택 여부 Y/N';
alter table public.public_holidays enable row level security;
revoke all on public.public_holidays from anon, authenticated;
grant all on public.public_holidays to service_role;

alter table public.leave
  drop constraint if exists leave_type_check;

update public.leave
set leave_type = case leave_type
  when '1' then '월차'
  when '2' then '연차'
  else leave_type
end
where leave_type in ('1', '2');

comment on column public.leave.leave_type is '휴가종류: leave_code 시스템설정에서 선택한 텍스트';

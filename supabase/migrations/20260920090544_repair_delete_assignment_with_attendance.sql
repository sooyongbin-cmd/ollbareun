create or replace function public.delete_assignment_with_attendance(p_assignment_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  assignment public.work_assignments%rowtype;
begin
  select * into assignment
  from public.work_assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception '배정 정보를 찾을 수 없습니다.';
  end if;

  delete from public.work_record
  where employee_id = assignment.employee_id
    and worksite_id = assignment.worksite_id
    and work_date between assignment.start_date and assignment.end_date;

  delete from public.work_assignments
  where id = p_assignment_id;
end;
$$;

revoke all on function public.delete_assignment_with_attendance(uuid) from public, anon, authenticated;
grant execute on function public.delete_assignment_with_attendance(uuid) to service_role;

notify pgrst, 'reload schema';

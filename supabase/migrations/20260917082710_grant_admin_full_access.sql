-- 관리자 계정은 public 스키마의 모든 애플리케이션 테이블을 CRUD할 수 있어야 합니다.
-- admin_users 자체를 RLS 정책에서 직접 조회하면 정책 재귀가 발생할 수 있으므로
-- 비공개 스키마의 SECURITY DEFINER 함수로 관리자 여부만 판별합니다.

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- PostgREST가 인증된 관리자의 요청을 테이블까지 전달할 수 있도록 기본 CRUD 권한을 보장합니다.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

do $$
declare
  table_name text;
begin
  for table_name in
    select c.relname
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format('drop policy if exists %I on public.%I', 'admin_full_access', table_name);
    execute format(
      'create policy %I on public.%I as permissive for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      'admin_full_access',
      table_name
    );
  end loop;
end;
$$;

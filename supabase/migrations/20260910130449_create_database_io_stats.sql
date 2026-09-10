create or replace function public.get_database_io_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  statements_schema text;
  query_stats jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = '관리자 인증이 필요합니다.';
  end if;

  if not exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = '관리자 권한이 필요합니다.';
  end if;

  select namespace.nspname
  into statements_schema
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where relation.relname = 'pg_stat_statements'
    and relation.relkind in ('v', 'm')
    and namespace.nspname in ('extensions', 'public', 'pg_catalog')
  order by case namespace.nspname
    when 'extensions' then 1
    when 'public' then 2
    else 3
  end
  limit 1;

  if statements_schema is not null then
    execute format($query$
      select coalesce(
        jsonb_agg(
          to_jsonb(query_stats)
          order by query_stats.shared_blks_read desc nulls last, query_stats.total_exec_time desc nulls last
        ),
        '[]'::jsonb
      )
      from (
        select
          queryid::text as query_id,
          calls,
          total_exec_time,
          mean_exec_time,
          shared_blks_read,
          shared_blks_hit,
          temp_blks_read,
          temp_blks_written,
          left(query, 240) as query
        from %I.pg_stat_statements
        where dbid = (
          select oid
          from pg_catalog.pg_database
          where datname = pg_catalog.current_database()
        )
          and query not ilike '%%pg_stat_statements%%'
        order by shared_blks_read desc nulls last, total_exec_time desc nulls last
        limit 100
      ) as query_stats
    $query$, statements_schema)
    into query_stats;
  end if;

  return jsonb_build_object(
    'tables', coalesce(
      (
        select jsonb_agg(
          to_jsonb(table_stats)
          order by table_stats.blocks_read desc nulls last, table_stats.table_name
        )
        from (
          select
            schemaname,
            relname as table_name,
            (
              heap_blks_read + idx_blks_read + toast_blks_read + tidx_blks_read
            )::bigint as blocks_read,
            (
              heap_blks_hit + idx_blks_hit + toast_blks_hit + tidx_blks_hit
            )::bigint as blocks_hit,
            round(
              100.0 * (
                heap_blks_hit + idx_blks_hit + toast_blks_hit + tidx_blks_hit
              )::numeric /
              nullif(
                heap_blks_read + idx_blks_read + toast_blks_read + tidx_blks_read +
                heap_blks_hit + idx_blks_hit + toast_blks_hit + tidx_blks_hit,
                0
              ),
              2
            ) as cache_hit_rate_percent,
            round(
              100.0 * (
                heap_blks_read + idx_blks_read + toast_blks_read + tidx_blks_read
              )::numeric /
              nullif(
                heap_blks_read + idx_blks_read + toast_blks_read + tidx_blks_read +
                heap_blks_hit + idx_blks_hit + toast_blks_hit + tidx_blks_hit,
                0
              ),
              2
            ) as read_ratio_percent
          from pg_catalog.pg_statio_user_tables
        ) as table_stats
      ),
      '[]'::jsonb
    ),
    'queries', query_stats,
    'query_stats_available', statements_schema is not null,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.get_database_io_stats() from public, anon, authenticated;
grant execute on function public.get_database_io_stats() to authenticated;

import { createSupabaseServerClient } from "./supabase-server";

export type DatabaseTableIoStat = {
  schemaName: string;
  tableName: string;
  blocksRead: number;
  blocksHit: number;
  cacheHitRatePercent: number | null;
  readRatioPercent: number | null;
};

export type DatabaseQueryIoStat = {
  queryId: string | null;
  calls: number;
  totalExecTimeMs: number;
  meanExecTimeMs: number;
  sharedBlocksRead: number;
  sharedBlocksHit: number;
  tempBlocksRead: number;
  tempBlocksWritten: number;
  query: string;
};

export type DatabaseIoStats = {
  tables: DatabaseTableIoStat[];
  queries: DatabaseQueryIoStat[];
  queryStatsAvailable: boolean;
  generatedAt: string | null;
};

type RawTableIoStat = {
  schemaname?: unknown;
  table_name?: unknown;
  blocks_read?: unknown;
  blocks_hit?: unknown;
  cache_hit_rate_percent?: unknown;
  read_ratio_percent?: unknown;
};

type RawQueryIoStat = {
  query_id?: unknown;
  calls?: unknown;
  total_exec_time?: unknown;
  mean_exec_time?: unknown;
  shared_blks_read?: unknown;
  shared_blks_hit?: unknown;
  temp_blks_read?: unknown;
  temp_blks_written?: unknown;
  query?: unknown;
};

type RawDatabaseIoStats = {
  tables?: unknown;
  queries?: unknown;
  query_stats_available?: unknown;
  generated_at?: unknown;
};

function asNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function normalizeTableStats(value: unknown): DatabaseTableIoStat[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((row) => {
    const table = (row ?? {}) as RawTableIoStat;

    return {
      schemaName: asString(table.schemaname, "public"),
      tableName: asString(table.table_name, "알 수 없는 테이블"),
      blocksRead: asNumber(table.blocks_read),
      blocksHit: asNumber(table.blocks_hit),
      cacheHitRatePercent: asNullableNumber(table.cache_hit_rate_percent),
      readRatioPercent: asNullableNumber(table.read_ratio_percent),
    };
  });
}

function normalizeQueryStats(value: unknown): DatabaseQueryIoStat[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((row) => {
    const query = (row ?? {}) as RawQueryIoStat;

    return {
      queryId: query.query_id == null ? null : asString(query.query_id),
      calls: asNumber(query.calls),
      totalExecTimeMs: asNumber(query.total_exec_time),
      meanExecTimeMs: asNumber(query.mean_exec_time),
      sharedBlocksRead: asNumber(query.shared_blks_read),
      sharedBlocksHit: asNumber(query.shared_blks_hit),
      tempBlocksRead: asNumber(query.temp_blks_read),
      tempBlocksWritten: asNumber(query.temp_blks_written),
      query: asString(query.query, "쿼리 내용을 확인할 수 없습니다."),
    };
  });
}

export async function loadDatabaseIoStats(): Promise<DatabaseIoStats> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_database_io_stats");

  if (error) {
    throw new Error(error.message || "DB I/O 통계를 불러오지 못했습니다.");
  }

  const payload = (data ?? {}) as RawDatabaseIoStats;

  return {
    tables: normalizeTableStats(payload.tables),
    queries: normalizeQueryStats(payload.queries),
    queryStatsAvailable: payload.query_stats_available === true,
    generatedAt: payload.generated_at == null ? null : asString(payload.generated_at),
  };
}

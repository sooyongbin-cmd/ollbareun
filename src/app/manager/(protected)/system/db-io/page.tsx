"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ManagerLoadingMessage from "../../manager-loading-message";
import type { DatabaseIoStats, DatabaseQueryIoStat, DatabaseTableIoStat } from "@/lib/database-io";
import { Activity, AlertCircle, Database, HardDrive, RefreshCw, Search, Server, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const numberFormatter = new Intl.NumberFormat("ko-KR");

function formatNumber(value: number) {
  return numberFormatter.format(Math.max(0, Math.round(value)));
}

function formatPercent(value: number | null) {
  return value == null ? "-" : `${value.toFixed(2)}%`;
}

function formatMilliseconds(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}초`;
  }

  return `${value.toFixed(2)}ms`;
}

function formatGeneratedAt(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "medium" });
}

function clampProgress(value: number | null) {
  return Math.min(100, Math.max(0, value ?? 0));
}

function TableIoRow({ table, index }: { table: DatabaseTableIoStat; index: number }) {
  return (
    <TableRow className="hover:bg-muted/40">
      <TableCell data-label="순위" className="w-16 text-center">
        <span
          className={
            index === 0
              ? "inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              : "inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
          }
        >
          {index + 1}
        </span>
      </TableCell>
      <TableCell data-label="테이블" className="font-mono font-semibold">
        <span className="break-all">{table.schemaName}.{table.tableName}</span>
      </TableCell>
      <TableCell data-label="Read blocks" className="text-right font-mono">
        {formatNumber(table.blocksRead)}
      </TableCell>
      <TableCell data-label="Cache hit" className="min-w-44">
        <div className="flex items-center gap-3">
          <Progress value={clampProgress(table.cacheHitRatePercent)} className="h-2 min-w-20" />
          <span className="w-16 text-right font-mono text-xs text-muted-foreground">
            {formatPercent(table.cacheHitRatePercent)}
          </span>
        </div>
      </TableCell>
      <TableCell data-label="전체 blocks" className="text-right font-mono text-muted-foreground">
        {formatNumber(table.blocksRead + table.blocksHit)}
      </TableCell>
    </TableRow>
  );
}

function QueryIoRow({ query }: { query: DatabaseQueryIoStat }) {
  return (
    <TableRow className="hover:bg-muted/40">
      <TableCell data-label="쿼리" className="min-w-[24rem] max-w-[42rem] whitespace-normal">
        <code className="block break-words font-mono text-xs leading-relaxed text-foreground/80">{query.query}</code>
      </TableCell>
      <TableCell data-label="호출" className="text-right font-mono">
        {formatNumber(query.calls)}
      </TableCell>
      <TableCell data-label="Read blocks" className="text-right font-mono">
        {formatNumber(query.sharedBlocksRead)}
      </TableCell>
      <TableCell data-label="Cache hit" className="text-right font-mono text-muted-foreground">
        {formatNumber(query.sharedBlocksHit)}
      </TableCell>
      <TableCell data-label="평균 실행시간" className="text-right whitespace-nowrap font-mono">
        {formatMilliseconds(query.meanExecTimeMs)}
      </TableCell>
      <TableCell data-label="총 실행시간" className="text-right whitespace-nowrap font-mono text-muted-foreground">
        {formatMilliseconds(query.totalExecTimeMs)}
      </TableCell>
    </TableRow>
  );
}

export default function DatabaseIoPage() {
  const [stats, setStats] = useState<DatabaseIoStats | null>(null);
  const [tableFilter, setTableFilter] = useState("");
  const [queryFilter, setQueryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/manager/database-io", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "DB I/O 통계를 불러오지 못했습니다.");
      }

      setStats(payload.stats ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "DB I/O 통계를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadStats]);

  const tableStats = useMemo(() => {
    const filter = tableFilter.trim().toLowerCase();
    const tables = stats?.tables ?? [];

    return filter
      ? tables.filter((table) => `${table.schemaName}.${table.tableName}`.toLowerCase().includes(filter))
      : tables;
  }, [stats?.tables, tableFilter]);

  const queryStats = useMemo(() => {
    const filter = queryFilter.trim().toLowerCase();
    const queries = stats?.queries ?? [];

    return filter ? queries.filter((query) => query.query.toLowerCase().includes(filter)) : queries;
  }, [queryFilter, stats?.queries]);

  const summary = useMemo(() => {
    const tables = stats?.tables ?? [];
    const totalRead = tables.reduce((total, table) => total + table.blocksRead, 0);
    const totalHit = tables.reduce((total, table) => total + table.blocksHit, 0);
    const totalBlocks = totalRead + totalHit;

    return {
      tableCount: tables.length,
      totalRead,
      totalHit,
      cacheHitRate: totalBlocks > 0 ? (totalHit / totalBlocks) * 100 : null,
      busiestTable: tables[0]?.tableName ?? "-",
    };
  }, [stats?.tables]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database aria-hidden="true" className="size-5" />
            </span>
            <h1 className="text-[1.75rem] leading-[1.2]">DB I/O</h1>
          </div>
          <p className="max-w-[48rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
            PostgreSQL 누적 통계로 테이블별 블록 읽기와 쿼리 실행 현황을 확인합니다. 물리 디스크 I/O와는 다를 수 있습니다.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadStats()} disabled={loading}>
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} />
          새로고침
        </Button>
      </header>

      {loading && !stats ? <ManagerLoadingMessage /> : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>DB I/O 통계를 불러오지 못했습니다.</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardDescription>추적 테이블</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">{formatNumber(summary.tableCount)}개</CardTitle>
                <CardAction>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Server aria-hidden="true" className="size-4" />
                  </span>
                </CardAction>
              </CardHeader>
            </Card>

            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardDescription>Read blocks</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">{formatNumber(summary.totalRead)}</CardTitle>
                <CardAction>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <HardDrive aria-hidden="true" className="size-4" />
                  </span>
                </CardAction>
              </CardHeader>
            </Card>

            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardDescription>전체 Cache hit rate</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">{formatPercent(summary.cacheHitRate)}</CardTitle>
                <CardAction>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Activity aria-hidden="true" className="size-4" />
                  </span>
                </CardAction>
              </CardHeader>
            </Card>

            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardDescription>최다 Read 테이블</CardDescription>
                <CardTitle className="truncate font-mono text-lg font-semibold">{summary.busiestTable}</CardTitle>
                <CardAction>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Timer aria-hidden="true" className="size-4" />
                  </span>
                </CardAction>
              </CardHeader>
            </Card>
          </div>

          {!stats.queryStatsAvailable ? (
            <Alert>
              <AlertCircle aria-hidden="true" />
              <AlertTitle>쿼리 통계가 비활성화되어 있습니다.</AlertTitle>
              <AlertDescription>
                테이블별 통계는 표시되지만 pg_stat_statements를 사용할 수 없어 쿼리별 I/O는 표시되지 않습니다.
              </AlertDescription>
            </Alert>
          ) : null}

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b py-5">
              <div>
                <CardTitle>테이블별 I/O</CardTitle>
                <CardDescription className="mt-2">
                  Read blocks가 많은 순서입니다. 통계는 PostgreSQL 재시작 또는 통계 초기화 이후부터 누적됩니다.
                </CardDescription>
              </div>
              <CardAction className="mt-1 w-full sm:w-64">
                <div className="relative w-full">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="테이블 검색"
                    className="pl-9"
                    value={tableFilter}
                    onChange={(event) => setTableFilter(event.target.value)}
                    placeholder="테이블명 검색"
                  />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table aria-label="테이블별 I/O 목록">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">순위</TableHead>
                      <TableHead>테이블</TableHead>
                      <TableHead className="text-right">Read blocks</TableHead>
                      <TableHead>Cache hit</TableHead>
                      <TableHead className="text-right">전체 blocks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableStats.length === 0 ? (
                      <TableRow>
                        <TableCell data-responsive-empty colSpan={5} className="p-10 text-center text-muted-foreground">
                          조회 결과에 해당하는 테이블이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableStats.slice(0, 100).map((table, index) => (
                        <TableIoRow key={`${table.schemaName}.${table.tableName}`} table={table} index={index} />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <div className="border-t px-6 py-3 text-xs text-muted-foreground">
              {tableFilter ? `${tableStats.length}개 검색됨` : `총 ${tableStats.length}개`} · 마지막 조회 {formatGeneratedAt(stats.generatedAt)}
            </div>
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b py-5">
              <div>
                <CardTitle>쿼리별 I/O</CardTitle>
                <CardDescription className="mt-2">
                  shared block Read와 총 실행시간이 큰 쿼리부터 표시합니다. 최근 누적된 쿼리 통계 중 최대 100건입니다.
                </CardDescription>
              </div>
              <CardAction className="mt-1 w-full sm:w-64">
                <div className="relative w-full">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="쿼리 검색"
                    className="pl-9"
                    value={queryFilter}
                    onChange={(event) => setQueryFilter(event.target.value)}
                    placeholder="쿼리 내용 검색"
                  />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table aria-label="쿼리별 I/O 목록">
                  <TableHeader>
                    <TableRow>
                      <TableHead>쿼리</TableHead>
                      <TableHead className="text-right">호출</TableHead>
                      <TableHead className="text-right">Read blocks</TableHead>
                      <TableHead className="text-right">Cache hit</TableHead>
                      <TableHead className="text-right">평균 실행시간</TableHead>
                      <TableHead className="text-right">총 실행시간</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryStats.length === 0 ? (
                      <TableRow>
                        <TableCell data-responsive-empty colSpan={6} className="p-10 text-center text-muted-foreground">
                          {stats.queryStatsAvailable ? "조회 결과에 해당하는 쿼리가 없습니다." : "표시할 쿼리 통계가 없습니다."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      queryStats.slice(0, 100).map((query, index) => <QueryIoRow key={`${query.queryId ?? query.query}-${index}`} query={query} />)
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-6 py-3 text-xs text-muted-foreground">
              <span>{queryFilter ? `${queryStats.length}개 검색됨` : `총 ${queryStats.length}개`}</span>
              <Badge variant="outline">누적 통계</Badge>
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}

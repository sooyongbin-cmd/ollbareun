"use client";

import ListResults from "@/components/list-results";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateTimeRange, scheduledClockInDisplay, formatDateTimeSegment } from "@/components/attendance-time-display";
import { educationToday } from "@/lib/education-periods";
import { employeeSummary } from "@/lib/employee-summary";
import type { AttendanceReportRow } from "@/lib/manager-reports";
import ManagerLoadingMessage from "../manager-loading-message";

const columns = ["근무지", "이름", "출근예정일", "출퇴근예정", "출퇴근", "근태"];

function weekday(workDate: string) {
  return new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "Asia/Seoul" })
    .format(new Date(`${workDate}T00:00:00+09:00`));
}

export default function WorkerInformationPage() {
  const [yearMonth, setYearMonth] = useState(() => educationToday().slice(0, 7));
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setRows([]);
      try {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error("조회년월을 확인하세요.");
        const response = await fetch(
          `/api/manager/worker-information?${new URLSearchParams({ yearMonth })}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "월간근태를 불러오지 못했습니다.");
        if (!controller.signal.aborted) setRows(data.rows ?? []);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "조회에 실패했습니다.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [yearMonth]);
  return (
    <section className="space-y-[1.5rem]">
      <header><h1 className="text-[1.75rem] leading-[1.2]">월간근태</h1></header>
      <section aria-label="월간근태 검색" className="manager-section rounded-xl border border-border/50 bg-muted/40">
        <div className="min-w-0 flex w-full flex-col gap-2 md:w-48">
          <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor="monthly-attendance-period">조회년월</label>
          <Input className="block w-full" id="monthly-attendance-period" type="month" value={yearMonth}
            onChange={(event) => setYearMonth(event.target.value)} />
        </div>
      </section>
      <section aria-label="월간근태 목록" className="manager-section rounded-xl border border-border/50 bg-muted/40">
        <ListResults count={rows.length} disabled={loading || Boolean(error)} />
        {loading ? <ManagerLoadingMessage className="mt-6" /> : error ? (
          <p role="alert" className="mt-6 text-destructive">{error}</p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto rounded-lg border border-border bg-background">
            <Table>
              <TableHeader><TableRow>{columns.map((column) => (
                <TableHead key={column} className="whitespace-nowrap">{column}</TableHead>
              ))}</TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={columns.length} data-responsive-empty className="p-8 text-center text-muted-foreground">
                    조회 결과에 해당하는 근태가 없습니다.
                  </TableCell></TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell data-label="근무지">{row.worksiteName || "-"}</TableCell>
                    <TableCell data-label="이름">
                      <Link className="text-primary underline underline-offset-4 hover:text-primary/80" href={`/manager/reports/attendance/detail/${row.id}`}>
                        {employeeSummary(row)}
                      </Link>
                    </TableCell>
                    <TableCell data-label="출근예정일" className="whitespace-nowrap">{row.workDate} ({weekday(row.workDate)})</TableCell>
                    <TableCell data-label="출퇴근예정">
                      <DateTimeRange start={scheduledClockInDisplay(row, row.workDate)}
                        end={formatDateTimeSegment(row.scheduledClockOut, row.workDate, row.workDate)} omitMissing />
                    </TableCell>
                    <TableCell data-label="출퇴근">
                      <DateTimeRange start={formatDateTimeSegment(row.clockInDateTime, row.workDate, row.workDate)}
                        end={formatDateTimeSegment(row.clockOutDateTime, row.workDate, row.workDate)} />
                    </TableCell>
                    <TableCell data-label="근태">{[row.status, row.outtimeLabel].filter(Boolean).join(" ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </section>
  );
}

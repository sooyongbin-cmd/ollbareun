"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCallback, useEffect, useRef, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { saveRowsAsXls } from "../export-xls";

type AttendanceReportRow = {
  id: string;
  workDate: string;
  employeeName: string;
  employeeRole: string;
  workStyle: string;
  worksiteName: string;
  scheduledClockIn: string;
  scheduledClockOut: string;
  clockInDateTime: string;
  clockOutDateTime: string | null;
  intimeStatus: "0" | "1" | "2" | "3";
  status: "결근" | "지각" | "출근" | "대기" | "휴가";
  outtimeStatus: "0" | "1" | "2";
  outtimeLabel: "" | "미퇴근" | "조퇴" | "퇴근";
  isLate: boolean;
};

function currentDate() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function employeeSummary(row: AttendanceReportRow) {
  const employeeRole = row.employeeRole || "-";
  const role = employeeRole === "경비원"
    ? "경비"
    : employeeRole === "미화원"
      ? "미화"
      : employeeRole === "주차원"
        ? "주차"
        : employeeRole;
  const workStyle = row.workStyle.endsWith("근무") ? row.workStyle.slice(0, -2) : row.workStyle;
  return `${row.employeeName} (${role},${workStyle})`;
}

function scheduledClockIn(row: AttendanceReportRow) {
  return row.workDate && row.scheduledClockIn !== "-"
    ? `${row.workDate} ${row.scheduledClockIn}`
    : "-";
}

function formatScheduledClockOut(row: AttendanceReportRow) {
  if (row.scheduledClockOut === "-") return "-";

  const clockInDate = scheduledClockIn(row).slice(0, 10);
  return clockInDate !== "-" && row.scheduledClockOut.slice(0, 10) === clockInDate
    ? row.scheduledClockOut.slice(11)
    : row.scheduledClockOut;
}

function scheduledClockInOut(row: AttendanceReportRow) {
  const clockIn = scheduledClockIn(row);
  const clockOut = formatScheduledClockOut(row);
  if (clockIn === "-") return clockOut;
  if (clockOut === "-") return clockIn;
  const separator = /^\d{2}:\d{2}$/.test(clockOut) ? " ~" : " ~ ";
  return `${clockIn}${separator}${clockOut}`;
}

function clockInTime(value: string) {
  return value.match(/(?:T|\s)(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/)?.[1] ?? value;
}

function formatClockOut(row: AttendanceReportRow) {
  const clockOut = row.clockOutDateTime;
  if (!clockOut || clockOut === "-") return "-";

  const scheduledClockInDate = scheduledClockIn(row).slice(0, 10);
  return scheduledClockInDate !== "-" && clockOut.slice(0, 10) === scheduledClockInDate
    ? clockOut.slice(11)
    : clockOut;
}

function clockInOut(row: AttendanceReportRow) {
  const clockIn = clockInTime(row.clockInDateTime);
  const clockOut = formatClockOut(row);
  if (clockIn === "-" && clockOut === "-") return "-";
  return `${clockIn} ~ ${clockOut}`;
}

export default function AttendanceReportPage() {
  const [employeeName, setEmployeeName] = useState("");
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [employeeNamesLoading, setEmployeeNamesLoading] = useState(true);
  const [workDate, setWorkDate] = useState(currentDate());
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchRequestRef = useRef(0);

  useEffect(() => {
    let ignore = false;

    async function loadEmployeeNames() {
      try {
        const response = await fetch("/api/bootstrap");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "직원 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          const names = (payload.employees ?? [])
            .filter((employee: { is_retired?: boolean }) => !employee.is_retired)
            .map((employee: { name: string }) => employee.name);
          setEmployeeNames(Array.from(new Set<string>(names)).sort((left, right) => left.localeCompare(right, "ko-KR")));
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "직원 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setEmployeeNamesLoading(false);
        }
      }
    }

    void loadEmployeeNames();

    return () => {
      ignore = true;
    };
  }, []);

  const handleSearch = useCallback(async () => {
    const requestId = ++searchRequestRef.current;
    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const params = new URLSearchParams({ employeeName: employeeName.trim() });
      if (workDate) params.set("workDate", workDate);
      const response = await fetch(`/api/manager/reports/attendance?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "근태내역을 불러오지 못했습니다.");
      }
      if (requestId !== searchRequestRef.current) return;
      setRows(payload.rows ?? []);
    } catch (loadError) {
      if (requestId !== searchRequestRef.current) return;
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "근태내역을 불러오지 못했습니다.");
    } finally {
      if (requestId === searchRequestRef.current) {
        setLoading(false);
      }
    }
  }, [employeeName, workDate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void handleSearch();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [handleSearch]);

  async function handleExport() {
    const headers = ["이름", "근무지", "출퇴근예정", "출퇴근", "출근", "퇴근"];
    await saveRowsAsXls({
      fileName: `올바름_근태_${employeeName.trim() || "전체"}_${workDate || "전체기간"}`,
      headers,
      rows: rows.map((row) => [
        employeeSummary(row),
        row.worksiteName,
        scheduledClockInOut(row),
        clockInOut(row),
        row.status,
        row.outtimeLabel,
      ]),
    });
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">근태관리</h1>
      </header>

      <section aria-label="근태내역 조회" className="rounded-xl border border-border/50 bg-muted/40 p-[2rem]">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-end">
          <div className="space-y-2">
            <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor="attendance-employee-name">
              직원이름
            </label>
            <Input
              className="block w-full"
              id="attendance-employee-name"
              list="attendance-employee-name-options"
              placeholder={employeeNamesLoading ? "직원 목록 로딩 중..." : "전체 직원"}
              value={employeeName}
              onChange={(event) => setEmployeeName(event.target.value)}
            />
            <datalist id="attendance-employee-name-options">
              {employeeNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor="attendance-work-date">
              출퇴근날짜
            </label>
            <Input
              className="block w-full"
              id="attendance-work-date"
              type="date"
              value={workDate}
              onChange={(event) => setWorkDate(event.target.value)}
            />
          </div>
          <Button className="h-9 min-h-9 px-4 py-0" type="button" onClick={handleExport} disabled={rows.length === 0}>
            엑셀
          </Button>
        </div>
      </section>

      <section aria-label="근태내역 목록" className="rounded-xl border border-border/50 bg-muted/40 p-[2rem]">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <span>조회 결과 {rows.length}</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">이름</TableHead>
                  <TableHead className="text-left">근무지</TableHead>
                  <TableHead className="text-left">출퇴근예정</TableHead>
                  <TableHead className="text-left">출퇴근</TableHead>
                  <TableHead className="text-left">출근</TableHead>
                  <TableHead className="text-left">퇴근</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={6} className="p-8 text-center text-muted-foreground italic">
                      {searched ? "조회 결과가 없습니다." : "조회 조건을 입력하세요."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell data-label="이름">
                        <Link href={`/manager/reports/attendance/detail/${row.id}`} className="text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50" aria-label={`${employeeSummary(row)} 근태 상세 보기`}>
                          {employeeSummary(row)}
                        </Link>
                      </TableCell>
                      <TableCell data-label="근무지">{row.worksiteName ?? "-"}</TableCell>
                      <TableCell
                        data-label="출퇴근예정"
                        className={
                          (row.scheduledClockIn !== "-" && row.workDate !== currentDate())
                          || (workDate && row.scheduledClockOut !== "-" && row.scheduledClockOut.slice(0, 10) !== workDate)
                            ? "text-yellow-700 dark:text-yellow-300"
                            : undefined
                        }
                      >
                        {scheduledClockInOut(row)}
                      </TableCell>
                      <TableCell data-label="출퇴근">{clockInOut(row)}</TableCell>
                      <TableCell
                        data-label="출근"
                        className={row.status === "지각"
                          ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-200"
                          : row.status === "결근"
                            ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200"
                            : row.status === "휴가"
                              ? "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200"
                              : row.status === "출근"
                              ? "text-green-700 dark:text-green-300"
                              : undefined}
                      >
                        {row.status}
                      </TableCell>
                      <TableCell
                        data-label="퇴근"
                        className={row.outtimeLabel === "조퇴"
                          ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-200"
                          : row.outtimeLabel === "미퇴근"
                            ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200"
                            : row.outtimeLabel === "퇴근"
                              ? "text-green-700 dark:text-green-300"
                              : undefined}
                      >
                        {row.outtimeLabel}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

    </section>
  );
}

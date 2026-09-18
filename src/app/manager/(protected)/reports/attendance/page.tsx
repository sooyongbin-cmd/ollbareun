"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCallback, useEffect, useRef, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { saveRowsAsXls } from "../export-xls";

type AttendanceReportRow = {
  id: string;
  employeeName: string;
  workStyle: string;
  worksiteName: string;
  scheduledClockIn: string;
  scheduledClockOut: string;
  clockInDateTime: string;
  clockOutDateTime: string | null;
  workDuration: string;
  intimeStatus: "0" | "1" | "2" | "3";
  isLate: boolean;
};

function currentDate() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const intimeStatusLabels: Record<AttendanceReportRow["intimeStatus"], string> = {
  "0": "결근",
  "1": "지각",
  "2": "정상출근",
  "3": "정상근무",
};

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
      const params = new URLSearchParams({
        employeeName: employeeName.trim(),
        workDate,
      });
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

  const showEmployeeColumn = employeeName.trim().length === 0;

  async function handleExport() {
    const headers = showEmployeeColumn
      ? ["이름", "근무형태", "근무지", "출근예정", "퇴근예정", "출근일시", "퇴근일시", "근무시간", "상태"]
      : ["근무형태", "근무지", "출근예정", "퇴근예정", "출근일시", "퇴근일시", "근무시간", "상태"];
    await saveRowsAsXls({
      fileName: `올바름_근태_${employeeName.trim() || "전체"}_${workDate}`,
      headers,
      rows: rows.map((row) =>
        showEmployeeColumn
          ? [row.employeeName, row.workStyle, row.worksiteName, row.scheduledClockIn, row.scheduledClockOut, row.clockInDateTime, row.clockOutDateTime ?? "-", row.workDuration, intimeStatusLabels[row.intimeStatus]]
          : [row.workStyle, row.worksiteName, row.scheduledClockIn, row.scheduledClockOut, row.clockInDateTime, row.clockOutDateTime ?? "-", row.workDuration, intimeStatusLabels[row.intimeStatus]],
      ),
    });
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">근태관리</h1>
      </header>

      <section aria-label="근태내역 조회" className="rounded-xl border border-border/50 bg-muted/40 p-[2rem]">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto] md:items-end">
          <div className="space-y-2">
            <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="attendance-employee-name">
              직원이름
            </label>
            <Input
              className="w-full"
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
            <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="attendance-work-date">
              출근날짜
            </label>
            <Input
              className="w-full"
              id="attendance-work-date"
              type="date"
              value={workDate}
              onChange={(event) => setWorkDate(event.target.value)}
            />
          </div>
          <Link href="/manager/reports/attendance/new" className="inline-flex h-[3rem] items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50"><span>출근등록</span><ArrowRightIcon size={18} /></Link>
          <Button className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 h-[3rem]" type="button" onClick={handleExport} disabled={rows.length === 0}>
            엑셀
          </Button>
        </div>
      </section>

      <section aria-label="근태내역 목록" className="rounded-xl border border-border/50 bg-muted/40 p-[2rem]">
        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  {showEmployeeColumn ? <TableHead className="text-left">이름</TableHead> : null}
                  <TableHead className="text-left">근무형태</TableHead>
                  <TableHead className="text-left">근무지</TableHead>
                  <TableHead className="text-left">출근예정</TableHead>
                  <TableHead className="text-left">퇴근예정</TableHead>
                  <TableHead className="text-left">출근일시</TableHead>
                  <TableHead className="text-left">퇴근일시</TableHead>
                  <TableHead className="text-left">근무시간</TableHead>
                  <TableHead className="text-left">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={showEmployeeColumn ? 9 : 8} className="p-8 text-center text-muted-foreground italic">
                      {searched ? "조회 결과가 없습니다." : "조회 조건을 입력하세요."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      {showEmployeeColumn ? <TableCell data-label="이름">{row.employeeName}</TableCell> : null}
                      <TableCell data-label="근무형태">{row.workStyle}</TableCell>
                      <TableCell data-label="근무지">{row.worksiteName ?? "-"}</TableCell>
                      <TableCell data-label="출근예정">{row.scheduledClockIn}</TableCell>
                      <TableCell data-label="퇴근예정">{row.scheduledClockOut}</TableCell>
                      <TableCell data-label="출근일시">
                        {row.clockInDateTime === "-" ? row.clockInDateTime : (
                          <Link
                            href={`/manager/reports/attendance/save/${row.id}`}
                            className="text-left text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50"
                            aria-label={`${row.clockInDateTime} 근태 기록 수정`}
                          >
                            {row.clockInDateTime}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell data-label="퇴근일시">{row.clockOutDateTime ?? "-"}</TableCell>
                      <TableCell data-label="근무시간">{row.workDuration}</TableCell>
                      <TableCell data-label="상태">
                        {intimeStatusLabels[row.intimeStatus]}
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

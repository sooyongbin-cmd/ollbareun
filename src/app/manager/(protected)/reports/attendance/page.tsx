"use client";

import { fetchDetailJson, PartialUpdateStatus, usePartialDetailUpdate } from "@/components/modals/partial-detail-update";

import DetailModalLink from "@/components/modals/detail-modal-link";

import ListResults from "@/components/list-results";

import type { AttendanceReportRow } from "@/lib/manager-reports";
import { DateTimeRange, scheduledClockInDisplay, formatDateTimeSegment } from "@/components/attendance-time-display";
import { employeeSummary } from "@/lib/employee-summary";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCallback, useEffect, useRef, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

function currentDate() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}


export default function AttendanceReportPage() {
  const [employeeName, setEmployeeName] = useState("");
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [employeeNamesLoading, setEmployeeNamesLoading] = useState(true);
  const [workDate, setWorkDate] = useState(currentDate());
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [appliedFilters, setAppliedFilters] = useState([{ label: "직원이름", value: "전체직원" }, { label: "출퇴근예정일", value: currentDate() }]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchRequestRef = useRef(0);

  const partial = usePartialDetailUpdate(async (changes, commit) => {
    const updates = await Promise.all(changes.filter((change) => change.entity === "attendance").map(async (change) => ({
      id: change.id,
      rows: change.action === "delete" ? [] : (await fetchDetailJson<{ rows: AttendanceReportRow[] }>(
        `/api/manager/reports/attendance?${new URLSearchParams({ attendanceId: change.id, employeeName: employeeName.trim(), workDate })}`,
      )).rows,
    })));
    commit(() => setRows((current) => current.flatMap((row) => {
      const update = updates.find((item) => item.id === row.id);
      return update ? update.rows.filter((item) => item.id === row.id) : [row];
    })));
  }, JSON.stringify([employeeName, workDate]));

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
      setAppliedFilters([{ label: "직원이름", value: employeeName.trim() || "전체직원" }, { label: "출퇴근예정일", value: workDate || "전체" }]);
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


  return (
    <section className="space-y-[1.5rem]">
      <PartialUpdateStatus {...partial} />
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">근태관리</h1>
      </header>

      <section aria-label="근태내역 조회" className="manager-section rounded-xl border border-border/50 bg-muted/40">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem] md:items-end">
          <div className="flex flex-col gap-2">
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
          <div className="flex flex-col gap-2">
            <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor="attendance-work-date">
              출퇴근예정일
            </label>
            <Input
              className="block w-full"
              id="attendance-work-date"
              type="date"
              value={workDate}
              onChange={(event) => setWorkDate(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section aria-label="근태내역 목록" className="manager-section rounded-xl border border-border/50 bg-muted/40">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <ListResults count={rows.length} disabled={loading || Boolean(error) || appliedFilters[0].value !== (employeeName.trim() || "전체직원") || appliedFilters[1].value !== (workDate || "전체")} filters={appliedFilters} />
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
                        <DetailModalLink onSaved={partial.onSaved} href={`/manager/reports/attendance/detail/${row.id}`} className="text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50" aria-label={`${employeeSummary(row)} 근태 상세 보기`}>
                          {employeeSummary(row)}
                        </DetailModalLink>
                      </TableCell>
                      <TableCell data-label="근무지">{row.worksiteName ?? "-"}</TableCell>
                      <TableCell data-label="출퇴근예정">
                        <DateTimeRange
                          start={scheduledClockInDisplay(row, workDate)}
                          end={formatDateTimeSegment(row.scheduledClockOut, workDate, row.workDate)}
                          omitMissing
                        />
                      </TableCell>
                      <TableCell data-label="출퇴근">
                        <DateTimeRange
                          start={formatDateTimeSegment(row.clockInDateTime, workDate, row.workDate)}
                          end={formatDateTimeSegment(row.clockOutDateTime, workDate, row.workDate)}
                        />
                      </TableCell>
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

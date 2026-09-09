"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { saveRowsAsXls } from "../export-xls";

type AttendanceReportRow = {
  id: string;
  employeeName: string;
  clockInDateTime: string;
  clockOutDateTime: string | null;
  workDuration: string;
};

function currentYear() {
  return new Date().getFullYear();
}

function currentKstDateTimeLocal() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 16);
}

export default function AttendanceReportPage() {
  const [employeeName, setEmployeeName] = useState("");
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [employeeNamesLoading, setEmployeeNamesLoading] = useState(true);
  const [year, setYear] = useState(currentYear());
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState<AttendanceReportRow | null>(null);
  const [clockInDateTime, setClockInDateTime] = useState("");
  const [clockOutDateTime, setClockOutDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
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
        year: String(year),
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
  }, [employeeName, year]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void handleSearch();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [handleSearch]);

  const showEmployeeColumn = employeeName.trim().length === 0;

  async function handleExport() {
    const headers = showEmployeeColumn
      ? ["직원이름", "출근일시", "퇴근일시", "근무시간"]
      : ["출근일시", "퇴근일시", "근무시간"];
    await saveRowsAsXls({
      fileName: `올바름_근태_${employeeName.trim() || "전체"}_${year}`,
      headers,
      rows: rows.map((row) =>
        showEmployeeColumn
          ? [row.employeeName, row.clockInDateTime, row.clockOutDateTime ?? "-", row.workDuration]
          : [row.clockInDateTime, row.clockOutDateTime ?? "-", row.workDuration],
      ),
    });
  }

  function openEditModal(row: AttendanceReportRow) {
    setSelectedRow(row);
    setClockInDateTime(row.clockInDateTime.replace(" ", "T"));
    setClockOutDateTime(row.clockOutDateTime?.replace(" ", "T") ?? currentKstDateTimeLocal());
    setModalError("");
  }

  function closeEditModal() {
    if (saving) return;
    setSelectedRow(null);
    setModalError("");
  }

  async function handleAttendanceSave() {
    if (!selectedRow) return;

    setSaving(true);
    setModalError("");
    try {
      const response = await fetch("/api/manager/reports/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: selectedRow.id,
          clockInDateTime,
          clockOutDateTime,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "근태 기록 수정에 실패했습니다.");
      }

      setSelectedRow(null);
      await handleSearch();
    } catch (saveError) {
      setModalError(saveError instanceof Error ? saveError.message : "근태 기록 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">근태내역</h1>
      </header>

      <section aria-label="근태내역 조회" className="rounded-xl border border-border/50 bg-muted/40 p-[2rem]">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-end">
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
            <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="attendance-year">
              연도
            </label>
            <Input
              className="w-full"
              id="attendance-year"
              min="2000"
              max="2100"
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
          </div>
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
                  {showEmployeeColumn ? <TableHead className="text-left">직원이름</TableHead> : null}
                  <TableHead className="text-left">출근일시</TableHead>
                  <TableHead className="text-left">퇴근일시</TableHead>
                  <TableHead className="text-left">근무시간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={showEmployeeColumn ? 4 : 3} className="p-8 text-center text-muted-foreground italic">
                      {searched ? "조회 결과가 없습니다." : "조회 조건을 입력하세요."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} id={`attendance-${row.id}`}>
                      {showEmployeeColumn ? <TableCell data-label="직원이름">{row.employeeName}</TableCell> : null}
                      <TableCell data-label="출근일시">
                        <a
                          href={`#attendance-${row.id}`}
                          className="text-left text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50"
                          onClick={(event) => {
                            event.preventDefault();
                            openEditModal(row);
                          }}
                          aria-label={`${row.clockInDateTime} 근태 기록 수정`}
                        >
                          {row.clockInDateTime}
                        </a>
                      </TableCell>
                      <TableCell data-label="퇴근일시">{row.clockOutDateTime ?? "-"}</TableCell>
                      <TableCell data-label="근무시간">{row.workDuration}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={selectedRow !== null} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="max-w-[27.5rem]">
          <DialogHeader>
            <DialogTitle>근태 기록 수정</DialogTitle>
            <DialogDescription>출근일시와 퇴근일시를 확인한 뒤 저장하세요.</DialogDescription>
          </DialogHeader>
            <div className="mt-6 space-y-2">
              <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="clock-in-date-time">
                출근일시
              </label>
              <Input
                autoFocus
                className="w-full"
                id="clock-in-date-time"
                type="datetime-local"
                value={clockInDateTime}
                onChange={(event) => setClockInDateTime(event.target.value)}
              />
            </div>
            <div className="mt-4 space-y-2">
              <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="clock-out-date-time">
                퇴근일시
              </label>
              <Input
                className="w-full"
                id="clock-out-date-time"
                type="datetime-local"
                value={clockOutDateTime}
                onChange={(event) => setClockOutDateTime(event.target.value)}
              />
            </div>
            {modalError && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-4">{modalError}</p>}
            <div className="mt-8 flex gap-3">
              <Button
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 flex-1"
                type="button"
                disabled={saving || !clockInDateTime}
                onClick={handleAttendanceSave}
              >
                {saving ? "저장 중..." : "저장"}
              </Button>
              <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 flex-1" type="button" disabled={saving} onClick={closeEditModal} variant="outline">
                취소
              </Button>
            </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

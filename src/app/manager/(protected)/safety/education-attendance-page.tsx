"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ManagerLoadingMessage from "../manager-loading-message";
import { educationTypeLabels, type EducationType } from "@/lib/education-periods";
import type {
  DailyEducationAttendanceRow,
  MonthlyEducationDetailRow,
  MonthlyEducationSummaryRow,
} from "@/lib/safety-education-attendance";

type EducationAttendanceMode = "daily" | "monthly";

function currentKstDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function currentKstYearMonth() {
  return currentKstDate().slice(0, 7);
}

function Mark({ completed, onClick, label }: { completed: boolean; onClick?: () => void; label?: string }) {
  if (!completed && onClick) {
    return (
      <button
        aria-label={label}
        className="cursor-pointer font-semibold text-destructive"
        onClick={onClick}
        style={{ color: "#dc2626" }}
        type="button"
      >
        X
      </button>
    );
  }
  return <span className={completed ? "font-semibold text-muted-foreground" : "text-destructive"}>{completed ? "O" : "X"}</span>;
}

type CompletionDialogState = {
  employeeId: string;
  employeeName: string;
  educationType: EducationType;
  workDate: string;
  status: "confirm" | "saving" | "success";
  error: string;
};

type EducationReminderExecutionResult = {
  scheduledDate?: string;
  scheduledTime?: string;
  successCount?: number;
  failedCount?: number;
  unregisteredCount?: number;
  failedEmployees?: { employeeId: string; employeeName: string; reason: string }[];
};

function educationDisplayLabel(type: EducationType) {
  return type === "monthly" ? "월별" : educationTypeLabels[type];
}

export default function EducationAttendancePage({ mode }: { mode: EducationAttendanceMode }) {
  const isDaily = mode === "daily";
  const [name, setName] = useState("");
  const [date, setDate] = useState(currentKstDate);
  const [yearMonth, setYearMonth] = useState(currentKstYearMonth);
  const [dailyRows, setDailyRows] = useState<DailyEducationAttendanceRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyEducationSummaryRow[]>([]);
  const [detailRows, setDetailRows] = useState<MonthlyEducationDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRunningReminder, setIsRunningReminder] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runResult, setRunResult] = useState<EducationReminderExecutionResult | null>(null);
  const [runError, setRunError] = useState("");
  const [completionDialog, setCompletionDialog] = useState<CompletionDialogState | null>(null);
  const requestIdRef = useRef(0);

  const loadRows = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(isDaily ? { view: "daily", date } : { view: "monthly", yearMonth });
      const response = await fetch(`/api/manager/safety-education?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "교육이수 자료를 불러오지 못했습니다.");
      if (requestId !== requestIdRef.current) return;
      if (isDaily) {
        setDailyRows(payload.rows ?? []);
      } else {
        setMonthlyRows(payload.summaryRows ?? []);
        setDetailRows(payload.detailRows ?? []);
      }
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setDailyRows([]);
      setMonthlyRows([]);
      setDetailRows([]);
      setError(loadError instanceof Error ? loadError.message : "교육이수 자료를 불러오지 못했습니다.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [date, isDaily, yearMonth]);

  useEffect(() => {
    void loadRows();
    return () => { requestIdRef.current += 1; };
  }, [loadRows]);

  const employeeNameOptions = useMemo(() => {
    const employeeNames = isDaily
      ? dailyRows.map((row) => row.employeeName)
      : [...monthlyRows.map((row) => row.employeeName), ...detailRows.map((row) => row.employeeName)];
    return Array.from(new Set(employeeNames)).sort((left, right) => left.localeCompare(right, "ko-KR"));
  }, [dailyRows, detailRows, isDaily, monthlyRows]);

  const filteredDailyRows = useMemo(() => {
    const normalizedName = name.trim().toLocaleLowerCase("ko-KR");
    return dailyRows.filter((row) => row.employeeName.toLocaleLowerCase("ko-KR").includes(normalizedName));
  }, [dailyRows, name]);
  const filteredMonthlyRows = useMemo(() => {
    const normalizedName = name.trim().toLocaleLowerCase("ko-KR");
    return monthlyRows.filter((row) => row.employeeName.toLocaleLowerCase("ko-KR").includes(normalizedName));
  }, [monthlyRows, name]);
  const filteredDetailRows = useMemo(() => {
    const normalizedName = name.trim().toLocaleLowerCase("ko-KR");
    return detailRows.filter((row) => row.employeeName.toLocaleLowerCase("ko-KR").includes(normalizedName));
  }, [detailRows, name]);
  const monthlyCompletionRate = useMemo(() => {
    const summaryCompleted = filteredMonthlyRows.reduce((count, row) =>
      count + Number(row.monthly) + Number(row.quarterly) + Number(row.semiannual), 0);
    const dailyCompleted = filteredDetailRows.reduce((count, row) => count + Number(row.daily), 0);
    const total = filteredMonthlyRows.length * 3 + filteredDetailRows.length;
    const completed = summaryCompleted + dailyCompleted;
    return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
  }, [filteredDetailRows, filteredMonthlyRows]);

  const runEducationReminders = async () => {
    setRunDialogOpen(true);
    setIsRunningReminder(true);
    setRunResult(null);
    setRunError("");

    try {
      const response = await fetch("/api/notifications/education-reminders/run", {
        method: "POST",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "교육알림 Edge Function 실행에 실패했습니다.");
      }

      setRunResult(payload as EducationReminderExecutionResult);
    } catch (runError) {
      setRunError(runError instanceof Error ? runError.message : "교육알림 실행 결과를 확인하지 못했습니다.");
    } finally {
      setIsRunningReminder(false);
    }
  };

  const closeRunDialog = (open: boolean) => {
    if (isRunningReminder && !open) return;
    setRunDialogOpen(open);
  };

  const runResultHasCounts = Boolean(
    runResult
      && (typeof runResult.successCount === "number"
        || typeof runResult.failedCount === "number"
        || typeof runResult.unregisteredCount === "number"),
  );
  const runResultHasNoPushes = Boolean(
    runResult
      && (runResult.successCount ?? 0) === 0
      && (runResult.failedCount ?? 0) === 0
      && (runResult.unregisteredCount ?? 0) === 0,
  );

  const openCompletionDialog = (
    employeeId: string,
    employeeName: string,
    educationType: EducationType,
    workDate = `${yearMonth}-01`,
  ) => {
    if (isDaily || !/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate) || workDate.slice(0, 7) !== yearMonth) return;
    setCompletionDialog({
      employeeId,
      employeeName,
      educationType,
      workDate,
      status: "confirm",
      error: "",
    });
  };

  const completeEducation = async () => {
    if (!completionDialog || completionDialog.status !== "confirm") return;
    const selected = completionDialog;
    setCompletionDialog({ ...selected, status: "saving", error: "" });
    try {
      const response = await fetch("/api/manager/safety-education/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selected.employeeId,
          educationType: selected.educationType,
          yearMonth,
          workDate: selected.workDate,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "교육이수 처리에 실패했습니다.");
      setCompletionDialog((current) => current ? { ...current, status: "success", error: "" } : current);
    } catch (saveError) {
      setCompletionDialog((current) => current ? {
        ...current,
        status: "confirm",
        error: saveError instanceof Error ? saveError.message : "교육이수 처리에 실패했습니다.",
      } : current);
    }
  };

  const closeCompletionDialogAndShowResult = () => {
    const selected = completionDialog;
    if (!selected || selected.status !== "success") return;

    if (selected.educationType === "daily") {
      setDetailRows((current) => current.map((row) =>
        row.employeeId === selected.employeeId && row.workDate === selected.workDate
          ? { ...row, daily: true }
          : row));
    } else {
      setMonthlyRows((current) => current.map((row) => {
        if (row.employeeId !== selected.employeeId) return row;
        if (selected.educationType === "monthly") return { ...row, monthly: true };
        if (selected.educationType === "quarterly") return { ...row, quarterly: true };
        return { ...row, semiannual: true };
      }));
    }
    setCompletionDialog(null);
  };

  const title = isDaily ? "일별교육이수" : "월별교육이수";

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">{title}</h1>
          <p className="max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
            {isDaily ? "조회일에 근무한 직원의 안전교육 이수 여부를 확인합니다." : "조회년월에 근무한 직원의 교육 이수 현황과 일일교육 기록을 확인합니다."}
          </p>
        </div>
      </header>

      <section
        aria-label={`${title} 조회`}
        className="rounded-xl border border-border/50 bg-muted/40 p-[1.5rem] md:p-[2rem]"
      >
        <div className={`grid gap-4 md:items-end ${isDaily ? "md:grid-cols-[minmax(0,1fr)_12rem]" : "md:grid-cols-[minmax(0,1fr)_12rem_auto_auto]"}`}>
          <div className="min-w-0 space-y-2">
            <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor={`${mode}-education-name`}>
              이름
            </label>
            <Input
              className="block w-full"
              id={`${mode}-education-name`}
              list={`${mode}-education-name-options`}
              placeholder="이름을 입력하세요."
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <datalist id={`${mode}-education-name-options`}>
              {employeeNameOptions.map((employeeName) => <option key={employeeName} value={employeeName} />)}
            </datalist>
          </div>
          <div className="min-w-0 space-y-2">
            <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor={`${mode}-education-period`}>
              {isDaily ? "조회일" : "조회년월"}
            </label>
            <Input
              className="block w-full"
              id={`${mode}-education-period`}
              type={isDaily ? "date" : "month"}
              value={isDaily ? date : yearMonth}
              onChange={(event) => isDaily ? setDate(event.target.value) : setYearMonth(event.target.value)}
            />
          </div>
          {!isDaily ? (
            <div aria-live="polite" className="min-w-0 space-y-2 text-right md:justify-self-end">
              <span className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground">이수율</span>
              <p className="flex min-h-10 items-center justify-end whitespace-nowrap font-semibold">
                {monthlyCompletionRate.completed}/{monthlyCompletionRate.total} {monthlyCompletionRate.percent}%
              </p>
            </div>
          ) : null}
          {!isDaily ? (
            <div className="flex min-h-10 items-end justify-end">
              <Button type="button" disabled={isRunningReminder} onClick={() => void runEducationReminders()}>
                {isRunningReminder ? "실행 중…" : "교육알림"}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {isDaily ? (
        <EducationAttendanceTable
          ariaLabel="일별교육이수 목록"
          count={filteredDailyRows.length}
          loading={loading}
          error={error}
          emptyMessage="조회 결과에 해당하는 근무자가 없습니다."
          headers={["이름", "일일", "월별", "분기", "반기"]}
        >
          {filteredDailyRows.map((row) => (
            <TableRow key={row.employeeId} className="hover:bg-muted/40 transition-colors">
              <TableCell data-label="이름" className="font-semibold">{row.employeeName}</TableCell>
              <TableCell data-label="일일"><Mark completed={row.daily} /></TableCell>
              <TableCell data-label="월별"><Mark completed={row.monthly} /></TableCell>
              <TableCell data-label="분기"><Mark completed={row.quarterly} /></TableCell>
              <TableCell data-label="반기"><Mark completed={row.semiannual} /></TableCell>
            </TableRow>
          ))}
        </EducationAttendanceTable>
      ) : (
        <>
          <EducationAttendanceTable
            ariaLabel="월별교육이수 현황"
            count={filteredMonthlyRows.length}
            loading={loading}
            error={error}
            emptyMessage="조회 결과에 해당하는 근무자가 없습니다."
            headers={["이름", "월별", "분기", "반기"]}
          >
            {filteredMonthlyRows.map((row) => (
              <TableRow key={row.employeeId} className="hover:bg-muted/40 transition-colors">
                <TableCell data-label="이름" className="font-semibold">{row.employeeName}</TableCell>
                <TableCell data-label="월별"><Mark completed={row.monthly} onClick={() => openCompletionDialog(row.employeeId, row.employeeName, "monthly")} label={`${row.employeeName} 근무자 월별 교육 미이수 처리`} /></TableCell>
                <TableCell data-label="분기"><Mark completed={row.quarterly} onClick={() => openCompletionDialog(row.employeeId, row.employeeName, "quarterly")} label={`${row.employeeName} 근무자 분기 교육 미이수 처리`} /></TableCell>
                <TableCell data-label="반기"><Mark completed={row.semiannual} onClick={() => openCompletionDialog(row.employeeId, row.employeeName, "semiannual")} label={`${row.employeeName} 근무자 반기 교육 미이수 처리`} /></TableCell>
              </TableRow>
            ))}
          </EducationAttendanceTable>
          <EducationAttendanceTable
            ariaLabel="월별 일일교육이수 기록"
            count={filteredDetailRows.length}
            loading={loading}
            error={error}
            emptyMessage="조회년월에 등록된 교육이수 자료가 없습니다."
            headers={["이름", "출근일", "일일교육"]}
          >
            {filteredDetailRows.map((row, index) => {
              const previous = filteredDetailRows[index - 1];
              const showName = !previous || previous.employeeId !== row.employeeId;
              return (
                <TableRow key={`${row.employeeId}:${row.workDate}`} className="hover:bg-muted/40 transition-colors">
                  <TableCell data-label="이름" className="font-semibold">{showName ? row.employeeName : "-"}</TableCell>
                  <TableCell data-label="출근일" className="whitespace-nowrap text-muted-foreground">{row.workDate}</TableCell>
                  <TableCell data-label="일일교육"><Mark completed={row.daily} onClick={() => openCompletionDialog(row.employeeId, row.employeeName, "daily", row.workDate)} label={`${row.employeeName} 근무자 일일교육 미이수 처리 (${row.workDate})`} /></TableCell>
                </TableRow>
              );
            })}
          </EducationAttendanceTable>
        </>
      )}

      <Dialog open={runDialogOpen} onOpenChange={closeRunDialog}>
        <DialogContent className="dark:text-white">
          <DialogHeader>
            <DialogTitle>
              {isRunningReminder ? "교육알림 실행 중" : runError ? "교육알림 실행 실패" : "교육알림 실행 결과"}
            </DialogTitle>
            <DialogDescription>
              {isRunningReminder
                ? "기한이 지난 안전교육 예약 작업을 확인하고 있습니다."
                : runError
                  ? "Edge Function 실행 중 오류가 발생했습니다."
                  : runResultHasNoPushes
                    ? "실행은 완료됐지만 전송된 푸시가 없습니다. 기한이 지난 미이수 작업이 없을 수 있습니다."
                    : "기한이 지난 안전교육 예약 작업의 푸시 전송 결과입니다."}
            </DialogDescription>
          </DialogHeader>

          {isRunningReminder ? (
            <ManagerLoadingMessage />
          ) : runError ? (
            <p role="alert" className="text-sm text-destructive">{runError}</p>
          ) : runResult ? (
            <div className="space-y-3">
              {runResultHasCounts ? (
                <dl className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-4 text-center text-sm">
                  <div>
                    <dt className="text-muted-foreground">성공</dt>
                    <dd className="mt-1 font-semibold">{runResult.successCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">실패</dt>
                    <dd className="mt-1 font-semibold">{runResult.failedCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">구독 없음</dt>
                    <dd className="mt-1 font-semibold">{runResult.unregisteredCount ?? 0}</dd>
                  </div>
                </dl>
              ) : null}
              {runResult.scheduledDate && runResult.scheduledTime ? (
                <p className="text-xs text-muted-foreground">
                  실행 시각: {runResult.scheduledDate} {runResult.scheduledTime}
                </p>
              ) : null}
              {runResult.failedEmployees && runResult.failedEmployees.length > 0 ? (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-3 text-sm">
                  {runResult.failedEmployees.map((employee) => (
                    <li key={employee.employeeId}>
                      <span className="font-medium">{employee.employeeName}</span>: {employee.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {!isRunningReminder ? (
            <DialogFooter>
              <Button type="button" onClick={() => setRunDialogOpen(false)}>확인</Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={completionDialog !== null}
        onOpenChange={(open) => {
          if (open) return;
          if (completionDialog?.status === "confirm") setCompletionDialog(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => {
            if (completionDialog?.status !== "confirm") event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (completionDialog?.status !== "confirm") event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {completionDialog?.status === "success"
                ? "처리되었습니다."
                : `${completionDialog?.employeeName ?? ""} 근무자의 ${completionDialog ? educationDisplayLabel(completionDialog.educationType) : ""} 교육을 이수처리할까요?`}
            </DialogTitle>
            {completionDialog?.status === "confirm" ? (
              <DialogDescription>
                이수일자는 {completionDialog.educationType === "daily" ? `출근일(${completionDialog.workDate})` : completionDialog.workDate} 입니다.
              </DialogDescription>
            ) : completionDialog?.status === "saving" ? (
              <DialogDescription asChild>
                <div aria-live="polite" className="flex items-center gap-2" role="status">
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  <span>처리중입니다...</span>
                </div>
              </DialogDescription>
            ) : completionDialog?.status === "success" ? (
              <DialogDescription>교육이수 처리가 완료되었습니다.</DialogDescription>
            ) : null}
          </DialogHeader>
          {completionDialog?.error ? <p className="text-sm text-destructive" role="alert">{completionDialog.error}</p> : null}
          {completionDialog?.status === "confirm" ? (
            <DialogFooter>
              <Button onClick={() => void completeEducation()} type="button">이수처리</Button>
              <Button onClick={() => setCompletionDialog(null)} type="button" variant="outline">취소</Button>
            </DialogFooter>
          ) : completionDialog?.status === "success" ? (
            <DialogFooter>
              <Button onClick={closeCompletionDialogAndShowResult} type="button">확인</Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function EducationAttendanceTable({
  ariaLabel,
  count,
  loading,
  error,
  emptyMessage,
  headers,
  children,
}: {
  ariaLabel: string;
  count: number;
  loading: boolean;
  error: string;
  emptyMessage: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <section aria-label={ariaLabel} className="rounded-xl border border-border/50 bg-muted/40 p-[1.5rem] md:p-[2rem]">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
        <span>조회 결과 {count}</span>
      </div>
      {loading ? (
        <ManagerLoadingMessage />
      ) : error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
      ) : (
        <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
          <Table className="w-full">
            <TableHeader>
              <TableRow>{headers.map((header) => <TableHead key={header} className="text-left">{header}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {count === 0 ? (
                <TableRow>
                  <TableCell data-responsive-empty colSpan={headers.length} className="p-8 text-center text-muted-foreground italic">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : children}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

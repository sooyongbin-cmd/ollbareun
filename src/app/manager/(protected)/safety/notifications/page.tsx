"use client";

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import ManagerLoadingMessage from "../../manager-loading-message";

const byPrefixAndName = {
  fas: {
    check: "check" as const,
  },
};

function FontAwesomeIcon({ icon, className }: { icon: typeof byPrefixAndName.fas.check; className?: string }) {
  if (icon === "check") {
    return <Check className={className} size={16} />;
  }
  return null;
}

type PushNotificationRunStatus = "processing" | "sent" | "failed" | "skipped";

type PushNotificationRunRow = {
  id: string;
  notification_code: string;
  scheduled_date: string;
  scheduled_time: string;
  status: PushNotificationRunStatus;
  sent_at: string | null;
  error_message: string | null;
  result: unknown | null;
  created_at: string;
  updated_at: string;
};

type EducationReminderExecutionResult = {
  success?: boolean;
  skipped?: boolean;
  reason?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  successCount?: number;
  failedCount?: number;
  unregisteredCount?: number;
  failedEmployees?: { employeeId: string; employeeName: string; reason: string }[];
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("ko-KR")} ${date.toLocaleTimeString("ko-KR")}`;
}

function getStatusLabel(status: PushNotificationRunStatus) {
  if (status === "processing") return "처리중";
  if (status === "sent") return "발송완료";
  if (status === "failed") return "실패";
  return "건너뜀";
}

function summarizeResult(result: unknown) {
  if (!result || typeof result !== "object") {
    return "-";
  }

  const payload = result as {
    successCount?: unknown;
    failedCount?: unknown;
    unregisteredCount?: unknown;
  };
  const successCount = typeof payload.successCount === "number" ? payload.successCount : 0;
  const failedCount = typeof payload.failedCount === "number" ? payload.failedCount : 0;
  const unregisteredCount = typeof payload.unregisteredCount === "number" ? payload.unregisteredCount : 0;

  return `성공 ${successCount} / 실패 ${failedCount} / 미등록 ${unregisteredCount}`;
}

export default function ManagerSafetyNotificationsPage() {
  const [runs, setRuns] = useState<PushNotificationRunRow[]>([]);
  const [notificationCode, setNotificationCode] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRunningReminder, setIsRunningReminder] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runResult, setRunResult] = useState<EducationReminderExecutionResult | null>(null);
  const [runError, setRunError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (notificationCode) params.set("notificationCode", notificationCode);
    if (status) params.set("status", status);
    return params.toString();
  }, [notificationCode, status]);

  useEffect(() => {
    let ignore = false;

    async function loadRuns() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/notifications/runs${queryString ? `?${queryString}` : ""}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "자동알림 로그를 불러오지 못했습니다.");
        }

        if (!ignore) {
          setRuns(payload.runs ?? []);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "자동알림 로그를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadRuns();

    return () => {
      ignore = true;
    };
  }, [queryString, refreshKey]);

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
      setRefreshKey((current) => current + 1);
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
      && !runResult.skipped
      && (runResult.successCount ?? 0) === 0
      && (runResult.failedCount ?? 0) === 0
      && (runResult.unregisteredCount ?? 0) === 0,
  );

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">자동알림이력</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            안전교육 자동 푸쉬 발송 이력을 최근 100건까지 확인합니다.
          </p>
        </div>
      </header>

      <section aria-label="자동알림 검색" className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-[13.75rem] space-y-2">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="notification-code">
              알림코드
            </label>
            <NativeSelect
              className="w-full"
              id="notification-code"
              onChange={(event) => setNotificationCode(event.target.value)}
              value={notificationCode}
            >
              <NativeSelectOption value="">전체</NativeSelectOption>
              <NativeSelectOption value="education_reminder">education_reminder</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="w-[13.75rem] space-y-2">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="notification-status">
              상태
            </label>
            <NativeSelect
              className="w-full"
              id="notification-status"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <NativeSelectOption value="">전체</NativeSelectOption>
              <NativeSelectOption value="processing">처리중</NativeSelectOption>
              <NativeSelectOption value="sent">발송완료</NativeSelectOption>
              <NativeSelectOption value="failed">실패</NativeSelectOption>
              <NativeSelectOption value="skipped">건너뜀</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="ml-auto">
            <Button type="button" onClick={() => void runEducationReminders()} disabled={isRunningReminder}>
              {isRunningReminder ? "실행 중…" : "교육 알림 지금 실행"}
            </Button>
          </div>
        </div>
      </section>

      <section aria-label="자동알림 목록" className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        <div className="flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <span>조회 결과 {runs.length}</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage className="mt-6" />
        ) : error ? (
          <p className="mt-6 text-[1rem] text-destructive">{error}</p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">예약일</TableHead>
                  <TableHead className="text-left">예약시간</TableHead>
                  <TableHead className="text-left">상태</TableHead>
                  <TableHead className="text-left">발송시각</TableHead>
                  <TableHead className="text-left">발송결과</TableHead>
                  <TableHead className="text-left">오류내용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={6} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 자동알림 로그가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow key={run.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="예약일" className="whitespace-nowrap">{run.scheduled_date}</TableCell>
                      <TableCell data-label="예약시간" className="whitespace-nowrap font-semibold">{run.scheduled_time}</TableCell>
                      <TableCell data-label="상태" className="whitespace-nowrap">
                        {run.status === "sent" ? (
                          <span className="inline-flex items-center text-primary font-semibold" title={getStatusLabel(run.status)}>
                            <FontAwesomeIcon icon={byPrefixAndName.fas['check']} />
                          </span>
                        ) : (
                          getStatusLabel(run.status)
                        )}
                      </TableCell>
                      <TableCell data-label="발송시각" className="whitespace-nowrap">{formatDateTime(run.sent_at)}</TableCell>
                      <TableCell data-label="발송결과" className="min-w-[13.75rem] text-foreground/80">{summarizeResult(run.result)}</TableCell>
                      <TableCell data-label="오류내용" className="min-w-[11.25rem] text-muted-foreground">{run.error_message ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={runDialogOpen} onOpenChange={closeRunDialog}>
        <DialogContent className="dark:text-white">
          <DialogHeader>
            <DialogTitle>
              {isRunningReminder ? "교육 알림 실행 중" : runError ? "교육 알림 실행 실패" : "교육 알림 실행 결과"}
            </DialogTitle>
            <DialogDescription>
              {isRunningReminder
                ? "기한이 지난 안전교육 예약 작업을 확인하고 있습니다."
                : runError
                  ? "Edge Function 실행 중 오류가 발생했습니다."
                  : runResult?.skipped
                    ? "중복 실행으로 이번 요청을 건너뛰었습니다."
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
    </section>
  );
}

"use client";

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
  }, [queryString]);

  return (
    <section className="space-y-[24px]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold leading-[1.1]">자동알림이력</h1>
          <p className="text-[21px] font-normal text-muted-foreground max-w-[640px]">
            안전교육 자동 푸쉬 발송 이력을 최근 100건까지 확인합니다.
          </p>
        </div>
      </header>

      <section aria-label="자동알림 검색" className="bg-muted/40 rounded-xl p-[32px] border border-border/50">
        <div className="flex flex-wrap gap-4">
          <div className="w-[220px] space-y-2">
            <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="notification-code">
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
          <div className="w-[220px] space-y-2">
            <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="notification-status">
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
        </div>
      </section>

      <section aria-label="자동알림 목록" className="bg-muted/40 rounded-xl p-[32px] border border-border/50">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-muted-foreground">
          <span>조회 결과 {runs.length}건</span>
          <span>최근 100건</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage className="mt-6" />
        ) : error ? (
          <p className="mt-6 text-[16px] text-destructive">{error}</p>
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
                      <TableCell data-label="발송결과" className="min-w-[220px] text-foreground/80">{summarizeResult(run.result)}</TableCell>
                      <TableCell data-label="오류내용" className="min-w-[180px] text-muted-foreground">{run.error_message ?? "-"}</TableCell>
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

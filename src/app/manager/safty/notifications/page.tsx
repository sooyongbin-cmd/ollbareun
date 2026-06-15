"use client";

import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

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
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    return params.toString();
  }, [status]);

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
          <h1 className="text-[40px] font-semibold leading-[1.1]">자동알림</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            안전교육 자동 푸쉬 발송 이력을 최근 100건까지 확인합니다.
          </p>
        </div>
      </header>

      <section aria-label="자동알림 검색" className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <div className="max-w-[220px] space-y-2">
          <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="notification-status">
            상태
          </label>
          <select
            className="field"
            id="notification-status"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">전체</option>
            <option value="processing">처리중</option>
            <option value="sent">발송완료</option>
            <option value="failed">실패</option>
            <option value="skipped">건너뜀</option>
          </select>
        </div>
      </section>

      <section aria-label="자동알림 목록" className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>조회 결과 {runs.length}건</span>
          <span>최근 100건</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage className="mt-6" />
        ) : error ? (
          <p className="mt-6 text-[16px] text-status-warn">{error}</p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">예약일</th>
                  <th className="text-left">예약시간</th>
                  <th className="text-left">알림코드</th>
                  <th className="text-left">상태</th>
                  <th className="text-left">발송시각</th>
                  <th className="text-left">발송결과</th>
                  <th className="text-left">오류내용</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과에 해당하는 자동알림 로그가 없습니다.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run.id} className="hover:bg-canvas-parchment transition-colors">
                      <td className="whitespace-nowrap">{run.scheduled_date}</td>
                      <td className="whitespace-nowrap font-semibold">{run.scheduled_time}</td>
                      <td className="font-semibold">{run.notification_code}</td>
                      <td>{getStatusLabel(run.status)}</td>
                      <td className="whitespace-nowrap">{formatDateTime(run.sent_at)}</td>
                      <td className="min-w-[220px] text-ink-muted-80">{summarizeResult(run.result)}</td>
                      <td className="min-w-[180px] text-ink-muted-48">{run.error_message ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { CheckIcon } from "@/components/icons/check-icon";
import { XmarkIcon } from "@/components/icons/xmark-icon";

type GuardSessionLogRow = {
  id: string;
  employee_id: string | null;
  guard_name: string;
  login_status: "success" | "failed";
  login_at: string;
  login_error: string | null;
  main_push_processed_at: string | null;
  main_push_status: "success" | "warning" | "error" | "skipped" | null;
  main_push_result: unknown | null;
  logout_at: string | null;
  logout_browser_push_status: string | null;
  logout_server_push_status: string | null;
  logout_session_status: string | null;
  logout_push_result: unknown | null;
};

function formatDateTimeParts(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: value, time: "" };
  }

  return {
    date: date.toLocaleDateString("ko-KR"),
    time: date.toLocaleTimeString("ko-KR"),
  };
}

function DateTimeCell({ value }: { value: string | null }) {
  const parts = formatDateTimeParts(value);

  if (!parts) {
    return <span>-</span>;
  }

  return (
    <span className="inline-flex flex-col leading-relaxed">
      <span>{parts.date}</span>
      {parts.time ? <span className="text-ink-muted-48">{parts.time}</span> : null}
    </span>
  );
}

function getMainPushStatusLabel(status: GuardSessionLogRow["main_push_status"]) {
  if (status === "warning") return "확인필요";
  if (status === "skipped") return "건너뜀";
  return "미처리";
}

function StatusIcon({ status }: { status: "success" | "failed" | "error" }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center justify-center text-[#16a34a]" role="img" aria-label="성공">
        <CheckIcon size={18} />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center text-[#dc2626]" role="img" aria-label="실패">
      <XmarkIcon size={18} />
    </span>
  );
}

function MainPushStatus({ status }: { status: GuardSessionLogRow["main_push_status"] }) {
  if (status === "success") {
    return <StatusIcon status="success" />;
  }

  if (status === "error") {
    return <StatusIcon status="error" />;
  }

  return <span>{getMainPushStatusLabel(status)}</span>;
}

function getLogoutPushSummary(log: GuardSessionLogRow) {
  if (!log.logout_at) {
    return "미처리";
  }

  return [
    log.logout_browser_push_status ? `브라우저 ${log.logout_browser_push_status}` : null,
    log.logout_server_push_status ? `서버 ${log.logout_server_push_status}` : null,
    log.logout_session_status ? `세션 ${log.logout_session_status}` : null,
  ]
    .filter(Boolean)
    .join(" / ");
}

function getDetailSummary(log: GuardSessionLogRow) {
  if (log.login_error) {
    return log.login_error;
  }

  if (log.main_push_status === "error") {
    return "Push 연결 실패";
  }

  if (log.logout_server_push_status === "failed" || log.logout_browser_push_status === "failed") {
    return "로그아웃 Push 정리 실패";
  }

  return "-";
}

export default function ManagerSystemLogsPage() {
  const [logs, setLogs] = useState<GuardSessionLogRow[]>([]);
  const [guardName, setGuardName] = useState("");
  const [showFailedLogins, setShowFailedLogins] = useState(true);
  const [pushStatus, setPushStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (guardName.trim()) params.set("guardName", guardName.trim());
    params.set("loginStatus", showFailedLogins ? "failed" : "success");
    if (pushStatus) params.set("pushStatus", pushStatus);
    return params.toString();
  }, [guardName, showFailedLogins, pushStatus]);

  useEffect(() => {
    let ignore = false;

    async function loadLogs() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/guard/session-logs${queryString ? `?${queryString}` : ""}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "로그 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setLogs(payload.logs ?? []);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "로그 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadLogs();

    return () => {
      ignore = true;
    };
  }, [queryString]);

  return (
    <section className="space-y-[24px]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold leading-[1.1]">로그현황</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            경비원 로그인, Push 알림 연결, 로그아웃 처리 내역을 확인합니다. 최신 100건만 유지합니다.
          </p>
        </div>
      </header>

      <section aria-label="로그 검색" className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px_160px] md:items-end">
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="log-guard-name">
              경비원 이름
            </label>
            <input
              className="field"
              id="log-guard-name"
              value={guardName}
              onChange={(event) => setGuardName(event.target.value)}
              placeholder="이름을 입력하세요."
            />
          </div>

          <label className="flex h-[48px] items-center gap-2 text-[15px] font-semibold text-ink-muted-80">
            <input
              checked={showFailedLogins}
              className="h-4 w-4 accent-primary"
              onChange={(event) => setShowFailedLogins(event.target.checked)}
              type="checkbox"
            />
            실패
          </label>

          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="log-push-status">
              Push 상태
            </label>
            <select
              className="field"
              id="log-push-status"
              value={pushStatus}
              onChange={(event) => setPushStatus(event.target.value)}
            >
              <option value="">전체</option>
              <option value="success">성공</option>
              <option value="warning">확인필요</option>
              <option value="error">실패</option>
              <option value="skipped">건너뜀</option>
            </select>
          </div>
        </div>
      </section>

      <section aria-label="로그 목록" className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>최근 로그 {logs.length}건</span>
          <span>최신 로그인 순</span>
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
                  <th className="text-left">로그인 시각</th>
                  <th className="text-left">경비원</th>
                  <th className="text-center">로그인 결과</th>
                  <th className="text-center">main Push 결과</th>
                  <th className="text-left">로그아웃 시각</th>
                  <th className="text-left">로그아웃 Push 결과</th>
                  <th className="text-left">오류/상세</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td data-responsive-empty colSpan={7} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과에 해당하는 로그가 없습니다.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-canvas-parchment transition-colors">
                      <td data-label="로그인 시각" className="whitespace-nowrap">
                        <DateTimeCell value={log.login_at} />
                      </td>
                      <td data-label="경비원" className="font-semibold">{log.guard_name}</td>
                      <td data-label="로그인 결과" className="text-center">
                        <StatusIcon status={log.login_status} />
                      </td>
                      <td data-label="main Push 결과" className="text-center">
                        <MainPushStatus status={log.main_push_status} />
                      </td>
                      <td data-label="로그아웃 시각" className="whitespace-nowrap">
                        <DateTimeCell value={log.logout_at} />
                      </td>
                      <td data-label="로그아웃 Push 결과" className="min-w-[220px] text-ink-muted-48">{getLogoutPushSummary(log)}</td>
                      <td data-label="오류/상세" className="min-w-[180px] text-ink-muted-48">{getDetailSummary(log)}</td>
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

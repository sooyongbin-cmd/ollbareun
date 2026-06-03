"use client";

import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

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

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR");
}

function getLoginStatusLabel(status: GuardSessionLogRow["login_status"]) {
  return status === "success" ? "성공" : "실패";
}

function getMainPushStatusLabel(status: GuardSessionLogRow["main_push_status"]) {
  if (status === "success") return "성공";
  if (status === "warning") return "확인필요";
  if (status === "error") return "실패";
  if (status === "skipped") return "건너뜀";
  return "미처리";
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
  const [loginStatus, setLoginStatus] = useState("");
  const [pushStatus, setPushStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (guardName.trim()) params.set("guardName", guardName.trim());
    if (loginStatus) params.set("loginStatus", loginStatus);
    if (pushStatus) params.set("pushStatus", pushStatus);
    return params.toString();
  }, [guardName, loginStatus, pushStatus]);

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
            경비원 로그인, Push 알림 연결, 로그아웃 처리 내역을 확인합니다.
          </p>
        </div>
      </header>

      <section aria-label="로그 검색" className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_160px]">
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

          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="log-login-status">
              로그인 상태
            </label>
            <select
              className="field"
              id="log-login-status"
              value={loginStatus}
              onChange={(event) => setLoginStatus(event.target.value)}
            >
              <option value="">전체</option>
              <option value="success">성공</option>
              <option value="failed">실패</option>
            </select>
          </div>

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
                  <th className="text-left">경비원 이름</th>
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
                    <td colSpan={7} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과에 해당하는 로그가 없습니다.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-canvas-parchment transition-colors">
                      <td className="whitespace-nowrap">{formatDateTime(log.login_at)}</td>
                      <td className="font-semibold">{log.guard_name}</td>
                      <td className="text-center">{getLoginStatusLabel(log.login_status)}</td>
                      <td className="text-center">{getMainPushStatusLabel(log.main_push_status)}</td>
                      <td className="whitespace-nowrap">{formatDateTime(log.logout_at)}</td>
                      <td className="min-w-[220px] text-ink-muted-48">{getLogoutPushSummary(log)}</td>
                      <td className="min-w-[180px] text-ink-muted-48">{getDetailSummary(log)}</td>
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

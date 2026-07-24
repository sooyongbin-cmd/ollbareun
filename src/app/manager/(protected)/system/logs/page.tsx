"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      {parts.time ? <span className="text-muted-foreground">{parts.time}</span> : null}
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
      <span className="inline-flex items-center justify-center text-primary" role="img" aria-label="성공">
        <CheckIcon size={18} />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center text-destructive" role="img" aria-label="실패">
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
          <p className="text-[21px] font-normal text-muted-foreground max-w-[640px]">
            경비원 로그인, Push 알림 연결, 로그아웃 처리 내역을 확인합니다. 최신 100건만 유지합니다.
          </p>
        </div>
      </header>

      <section aria-label="로그 검색" className="bg-muted/40 rounded-xl p-[32px] border border-border/50">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px_160px] md:items-end">
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="log-guard-name">
              경비원 이름
            </label>
            <Input
              className="w-full"
              id="log-guard-name"
              value={guardName}
              onChange={(event) => setGuardName(event.target.value)}
              placeholder="이름을 입력하세요."
            />
          </div>

          <label className="flex h-[48px] items-center gap-2 text-[15px] font-semibold text-foreground/80">
            <Checkbox
              checked={showFailedLogins}
              onCheckedChange={(checked) => setShowFailedLogins(checked === true)}
            />
            실패
          </label>

          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="log-push-status">
              Push 상태
            </label>
            <NativeSelect
              className="w-full"
              id="log-push-status"
              value={pushStatus}
              onChange={(event) => setPushStatus(event.target.value)}
            >
              <NativeSelectOption value="">전체</NativeSelectOption>
              <NativeSelectOption value="success">성공</NativeSelectOption>
              <NativeSelectOption value="warning">확인필요</NativeSelectOption>
              <NativeSelectOption value="error">실패</NativeSelectOption>
              <NativeSelectOption value="skipped">건너뜀</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </section>

      <section aria-label="로그 목록" className="bg-muted/40 rounded-xl p-[32px] border border-border/50">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-muted-foreground">
          <span>최근 로그 {logs.length}건</span>
          <span>최신 로그인 순</span>
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
                  <TableHead className="text-left">로그인 시각</TableHead>
                  <TableHead className="text-left">경비원</TableHead>
                  <TableHead className="text-center">로그인 결과</TableHead>
                  <TableHead className="text-center">main Push 결과</TableHead>
                  <TableHead className="text-left">로그아웃 시각</TableHead>
                  <TableHead className="text-left">로그아웃 Push 결과</TableHead>
                  <TableHead className="text-left">오류/상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={7} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 로그가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="로그인 시각" className="whitespace-nowrap">
                        <DateTimeCell value={log.login_at} />
                      </TableCell>
                      <TableCell data-label="경비원" className="font-semibold">{log.guard_name}</TableCell>
                      <TableCell data-label="로그인 결과" className="text-center">
                        <StatusIcon status={log.login_status} />
                      </TableCell>
                      <TableCell data-label="main Push 결과" className="text-center">
                        <MainPushStatus status={log.main_push_status} />
                      </TableCell>
                      <TableCell data-label="로그아웃 시각" className="whitespace-nowrap">
                        <DateTimeCell value={log.logout_at} />
                      </TableCell>
                      <TableCell data-label="로그아웃 Push 결과" className="min-w-[220px] text-muted-foreground">{getLogoutPushSummary(log)}</TableCell>
                      <TableCell data-label="오류/상세" className="min-w-[180px] text-muted-foreground">{getDetailSummary(log)}</TableCell>
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

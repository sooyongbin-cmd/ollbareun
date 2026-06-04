"use client";

import { useEffect, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

type Worksite = {
  id: string;
  name: string;
};

type InspectionLog = {
  id: string;
  inspected_at: string;
  site_name: string;
  employee_name: string;
};

function formatDateTime(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

async function fetchLogs(worksiteId: string) {
  const query = worksiteId ? `?worksiteId=${encodeURIComponent(worksiteId)}` : "";
  const response = await fetch(`/api/inspection/logs${query}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "현장점검현황을 불러오지 못했습니다.");
  }

  return (payload.logs ?? []) as InspectionLog[];
}

export default function InspectionLogsPage() {
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [worksiteId, setWorksiteId] = useState("");
  const [logs, setLogs] = useState<InspectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadWorksites() {
      try {
        const response = await fetch("/api/bootstrap");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "근무지 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setWorksites(payload.worksites ?? []);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "근무지 목록을 불러오지 못했습니다.");
        }
      }
    }

    void loadWorksites();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadLogs() {
      setLoading(true);
      setError("");
      try {
        const nextLogs = await fetchLogs(worksiteId);
        if (!ignore) {
          setLogs(nextLogs);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "현장점검현황을 불러오지 못했습니다.");
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
  }, [worksiteId]);

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">현장점검현황</h1>
        <p className="mt-2 max-w-[640px] text-[21px] font-normal text-ink-muted-48">
          근무지별 현장점검 기록을 확인합니다.
        </p>
      </header>

      <section
        aria-label="현장점검현황 검색"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="space-y-2 max-w-[420px]">
          <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="inspection-log-worksite">
            근무지
          </label>
          <select
            className="field"
            id="inspection-log-worksite"
            value={worksiteId}
            onChange={(event) => setWorksiteId(event.target.value)}
          >
            <option value="">전체</option>
            {worksites.map((worksite) => (
              <option key={worksite.id} value={worksite.id}>
                {worksite.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section
        aria-label="현장점검현황 목록"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="status-warn text-center">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">점검날짜</th>
                  <th className="text-left">현장명</th>
                  <th className="text-left">점검자</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과에 해당하는 점검 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-canvas-parchment transition-colors">
                      <td>{formatDateTime(log.inspected_at)}</td>
                      <td className="font-semibold">{log.site_name}</td>
                      <td>{log.employee_name}</td>
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

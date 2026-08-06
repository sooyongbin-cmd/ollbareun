"use client";

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

type Worksite = {
  id: string;
  name: string;
};

type InspectionLog = {
  id: string;
  inspected_at: string;
  worksite_name: string;
  site_name: string;
  employee_name: string;
  employee_role?: string;
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
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">현장점검현황</h1>
        <p className="mt-2 max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
          근무지별 현장점검 기록을 확인합니다.
        </p>
      </header>

      <section
        aria-label="현장점검현황 검색"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="space-y-2 max-w-[26.25rem]">
          <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="inspection-log-worksite">
            근무지
          </label>
          <NativeSelect
            className="w-full"
            id="inspection-log-worksite"
            value={worksiteId}
            onChange={(event) => setWorksiteId(event.target.value)}
          >
            <NativeSelectOption value="">전체</NativeSelectOption>
            {worksites.map((worksite) => (
              <NativeSelectOption key={worksite.id} value={worksite.id}>
                {worksite.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </section>

      <section
        aria-label="현장점검현황 목록"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">점검일자</TableHead>
                  <TableHead className="text-left">근무지</TableHead>
                  <TableHead className="text-left">현장명</TableHead>
                  <TableHead className="text-left">점검자</TableHead>
                  <TableHead className="text-left">역할</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={5} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 점검 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="점검일자">{formatDateTime(log.inspected_at)}</TableCell>
                      <TableCell data-label="근무지">{log.worksite_name}</TableCell>
                      <TableCell data-label="현장명" className="font-semibold">{log.site_name}</TableCell>
                      <TableCell data-label="점검자">{log.employee_name}</TableCell>
                      <TableCell data-label="역할">{log.employee_role ?? "역할 없음"}</TableCell>
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

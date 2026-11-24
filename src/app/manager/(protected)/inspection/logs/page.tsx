"use client";

import Link from "next/link";
import ListResults from "@/components/list-results";

import { Input } from "@/components/ui/input";
import { educationToday } from "@/lib/education-periods";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

type InspectionLog = {
  id: string;
  inspected_at: string;
  worksite_id: string | null;
  inspection_site_id: string | null;
  worksite_name: string;
  specialRemarks?: { date: string; count: number } | null;
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

async function fetchLogs(yearMonth: string) {
  const response = await fetch(`/api/inspection/logs?${new URLSearchParams({ yearMonth, includeRemarkCounts: "true" })}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "점검지점검현황을 불러오지 못했습니다.");
  }

  return (payload.logs ?? []) as InspectionLog[];
}

export default function InspectionLogsPage() {
  const [worksiteNames, setWorksiteNames] = useState<string[]>([]);
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [worksiteQuery, setWorksiteQuery] = useState("");
  const [siteQuery, setSiteQuery] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [yearMonth, setYearMonth] = useState(() => educationToday().slice(0, 7));
  const [logs, setLogs] = useState<InspectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      try {
        const response = await fetch("/api/bootstrap");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "근무지와 근무자 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setWorksiteNames((payload.worksites ?? []).map(({ name }: { name: string }) => name));
          setEmployeeNames((payload.employees ?? []).map(({ name }: { name: string }) => name));
        }
      } catch (loadError) {
        if (!ignore) {
          setOptionsError(loadError instanceof Error ? loadError.message : "근무지와 근무자 목록을 불러오지 못했습니다.");
        }
      }
    }

    void loadOptions();

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
        if (!yearMonth) throw new Error("조회년월을 확인하세요.");
        const nextLogs = await fetchLogs(yearMonth);
        if (!ignore) {
          setLogs(nextLogs);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "점검지점검현황을 불러오지 못했습니다.");
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
  }, [yearMonth]);

  const filters = [
    { key: "worksite", label: "근무지", value: worksiteQuery, setValue: setWorksiteQuery, names: [...worksiteNames, ...logs.map((log) => log.worksite_name)] },
    { key: "site", label: "점검지", value: siteQuery, setValue: setSiteQuery, names: logs.map((log) => log.site_name) },
    { key: "employee", label: "근무자", value: employeeQuery, setValue: setEmployeeQuery, names: [...employeeNames, ...logs.map((log) => log.employee_name)] },
  ];
  const matches = (name: string, query: string) => name.toLowerCase().includes(query.trim().toLowerCase());
  const filteredLogs = logs.filter((log) =>
    matches(log.worksite_name, worksiteQuery)
    && matches(log.site_name, siteQuery)
    && matches(log.employee_name, employeeQuery),
  );

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">점검지점검현황</h1>
      </header>

      <section
        aria-label="점검지점검현황 검색"
        className="manager-section bg-muted/40 rounded-xl border border-border/50"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filters.map(({ key, label, value, setValue, names }) => {
            const id = `inspection-log-${key}`;
            const options = Array.from(new Set(names.filter(Boolean))).sort((left, right) => left.localeCompare(right, "ko-KR"));
            return (
              <div key={key} className="space-y-2">
                <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor={id}>{label}</label>
                <Input id={id} list={`${id}-options`} value={value}
                  onChange={(event) => setValue(event.target.value)} placeholder={`${label} 이름을 입력하세요.`} />
                <datalist id={`${id}-options`}>
                  {options.map((name) => <option key={name} value={name} />)}
                </datalist>
              </div>
            );
          })}
          <div className="space-y-2">
            <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor="inspection-log-period">조회년월</label>
            <Input id="inspection-log-period" type="month" value={yearMonth} onChange={(event) => setYearMonth(event.target.value)} />
          </div>
        </div>
        {optionsError ? <p role="alert" className="mt-3 text-sm text-destructive">{optionsError}</p> : null}
      </section>

      <section
        aria-label="점검지점검현황 목록"
        className="manager-section bg-muted/40 rounded-xl border border-border/50"
      >
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <ListResults count={filteredLogs.length} disabled={loading || Boolean(error)} />
        </div>

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
                  <TableHead className="text-left">점검지</TableHead>
                  <TableHead className="text-left">점검자</TableHead>
                  <TableHead className="text-left">직군</TableHead>
                  <TableHead className="text-left">특이사항</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={6} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 점검 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="점검일자">{formatDateTime(log.inspected_at)}</TableCell>
                      <TableCell data-label="근무지">{log.worksite_name}</TableCell>
                      <TableCell data-label="점검지" className="font-semibold">{log.site_name}</TableCell>
                      <TableCell data-label="점검자">{log.employee_name}</TableCell>
                      <TableCell data-label="직군">{log.employee_role ?? "직군 없음"}</TableCell>
                      <TableCell data-label="특이사항">
                        {log.specialRemarks && log.worksite_id && log.inspection_site_id && (
                          <Link
                            className="font-semibold text-primary underline underline-offset-4"
                            href={`/manager/inspection/special-remarks?${new URLSearchParams({
                              date: log.specialRemarks.date,
                              worksiteId: log.worksite_id,
                              inspectionSiteId: log.inspection_site_id,
                              siteName: log.site_name,
                            })}`}
                          >
                            {log.specialRemarks.count}건
                          </Link>
                        )}
                      </TableCell>
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

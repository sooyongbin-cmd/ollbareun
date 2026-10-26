"use client";

import { fetchDetailJson, PartialUpdateStatus, usePartialDetailUpdate } from "@/components/modals/partial-detail-update";

import Link from "next/link";

import DetailModalLink from "@/components/modals/detail-modal-link";

import ListResults from "@/components/list-results";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateTimeRange, scheduledClockInDisplay, formatDateTimeSegment } from "@/components/attendance-time-display";
import { educationToday } from "@/lib/education-periods";
import { employeeSummary } from "@/lib/employee-summary";
import type { MonthlyInformationRow } from "@/lib/monthly-information";
import { formatSpecialRemarkDateTime, summarizeSpecialRemarkContent } from "@/lib/special-remark-display";
import ManagerLoadingMessage from "../manager-loading-message";

const educationColumns = [
  { key: "daily", label: "일일" }, { key: "monthly", label: "월별" }, { key: "quarterly", label: "분기" },
  { key: "semiannual", label: "반기" }, { key: "other", label: "연간" },
] as const;
const columns = ["근무지", "이름", "직군", "근무형태", "생년월일", "연락처", "출근예정일", "출퇴근예정", "출퇴근", "근태", ...educationColumns.map(({ label }) => label), "특이사항"];

function formatPhone(phone?: string | null) {
  const value = phone?.trim() || "-";
  const digits = value.replace(/[\s-]/g, "");
  return /^\d{11}$/.test(digits) ? digits.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3") : value;
}

function employeeCells(row: MonthlyInformationRow) {
  return [row.worksiteName || "-", row.employeeName, row.employeeRole || "-", row.workStyle || "-", row.employeeBirthdate || "-", formatPhone(row.employeePhone)];
}

function isIncompleteEducation(value: string) {
  return value === "X";
}

function weekday(workDate: string) {
  return new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "Asia/Seoul" })
    .format(new Date(`${workDate}T00:00:00+09:00`));
}

export default function MonthlyInformationPage() {
  const [worksiteQuery, setWorksiteQuery] = useState("");
  const [worksiteNames, setWorksiteNames] = useState<string[]>([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [worksiteError, setWorksiteError] = useState("");
  const [yearMonth, setYearMonth] = useState(() => educationToday().slice(0, 7));
  const [rows, setRows] = useState<MonthlyInformationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const partial = usePartialDetailUpdate(async (changes, commit) => {
    const affected = new Set(changes.filter((change) => change.entity === "attendance").map((change) =>
      change.employeeId ?? rows.find((row) => row.id === change.id)?.employeeId).filter((id): id is string => Boolean(id)));
    if (changes.some((change) => change.entity === "attendance" && !change.employeeId && !rows.some((row) => row.id === change.id))) throw new Error("변경된 근태의 직원 정보를 확인하지 못했습니다.");
    const refreshed = (await Promise.all([...affected].map(async (employeeId) =>
      (await fetchDetailJson<{ rows: MonthlyInformationRow[] }>(`/api/manager/monthly-information?${new URLSearchParams({ yearMonth, employeeId })}`)).rows,
    ))).flat();
    commit(() => setRows((current) => {
      const next = [...current.filter((row) => !affected.has(row.employeeId)), ...refreshed];
      for (let index = 0; index < next.length; index++) {
        const row = next[index];
        const relevant = changes.filter((change) => change.entity === "remark" && row.remarks.some((remark) => remark.id === change.id));
        if (relevant.length) next[index] = { ...row, remarks: row.remarks.flatMap((remark) => {
          const change = relevant.find((item) => item.id === remark.id);
          if (change?.action === "delete") return [];
          return [{ ...remark, ...(typeof change?.data?.content === "string" ? { content: change.data.content } : {}),
            ...(typeof change?.data?.reported_at === "string" ? { reportedAt: change.data.reported_at } : {}) }];
        }) };
      }
      return next.sort((left, right) => left.worksiteName.localeCompare(right.worksiteName, "ko-KR")
        || left.employeeName.localeCompare(right.employeeName, "ko-KR") || left.workDate.localeCompare(right.workDate));
    }));
  }, yearMonth);

  useEffect(() => {
    const controller = new AbortController();
    async function loadWorksites() {
      try {
        const response = await fetch("/api/bootstrap", { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "근무지 목록을 불러오지 못했습니다.");
        if (!controller.signal.aborted) {
          setWorksiteNames((payload.worksites ?? []).map((site: { name: string }) => site.name));
          setEmployeeNames((payload.employees ?? []).map((employee: { name: string }) => employee.name));
        }
      } catch (cause) {
        if (!controller.signal.aborted) setWorksiteError(cause instanceof Error ? cause.message : "근무지 목록을 불러오지 못했습니다.");
      }
    }
    void loadWorksites();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setRows([]);
      try {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error("조회년월을 확인하세요.");
        const response = await fetch(
          `/api/manager/monthly-information?${new URLSearchParams({ yearMonth })}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "월별현황을 불러오지 못했습니다.");
        if (!controller.signal.aborted) setRows(data.rows ?? []);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "조회에 실패했습니다.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [yearMonth]);
  const worksiteNameOptions = useMemo(() => Array.from(new Set([...worksiteNames, ...rows.map((row) => row.worksiteName)]))
    .filter(Boolean).sort((left, right) => left.localeCompare(right, "ko-KR")), [worksiteNames, rows]);
  const employeeNameOptions = useMemo(() => Array.from(new Set([...employeeNames, ...rows.map((row) => row.employeeName)]))
    .filter(Boolean).sort((left, right) => left.localeCompare(right, "ko-KR")), [employeeNames, rows]);
  const filteredRows = useMemo(() => {
    const query = worksiteQuery.trim().toLowerCase();
    const nameQuery = employeeQuery.trim().toLowerCase();
    return rows.filter((row) => row.worksiteName.toLowerCase().includes(query) && row.employeeName.toLowerCase().includes(nameQuery));
  }, [rows, worksiteQuery, employeeQuery]);
  return (
    <section className="space-y-[1.5rem]">
      <PartialUpdateStatus {...partial} />
      <header><h1 className="text-[1.75rem] leading-[1.2]">월별현황</h1></header>
      <section aria-label="월별현황 검색" className="manager-section rounded-xl border border-border/50 bg-muted/40">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem] md:items-end">
          <div className="min-w-0 flex flex-col gap-2">
            <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor="monthly-information-worksite">근무지</label>
            <Input className="block w-full" id="monthly-information-worksite" list="monthly-information-worksite-options"
              value={worksiteQuery} onChange={(event) => setWorksiteQuery(event.target.value)} placeholder="근무지 이름을 입력하세요." />
            <datalist id="monthly-information-worksite-options">
              {worksiteNameOptions.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>
          <div className="min-w-0 flex flex-col gap-2">
            <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor="monthly-information-employee">근무자</label>
            <Input className="block w-full" id="monthly-information-employee" list="monthly-information-employee-options"
              value={employeeQuery} onChange={(event) => setEmployeeQuery(event.target.value)} placeholder="이름을 입력하세요." />
            <datalist id="monthly-information-employee-options">
              {employeeNameOptions.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>
          <div className="min-w-0 flex flex-col gap-2">
            <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor="monthly-information-period">조회년월</label>
            <Input className="block w-full" id="monthly-information-period" type="month" value={yearMonth}
              onChange={(event) => setYearMonth(event.target.value)} />
          </div>
        </div>
        {worksiteError ? <p role="alert" className="mt-3 text-sm text-destructive">{worksiteError}</p> : null}
      </section>
      <section aria-label="월별현황 목록" className="manager-section rounded-xl border border-border/50 bg-muted/40">
        <ListResults count={filteredRows.length} disabled={loading || Boolean(error)} />
        {loading ? <ManagerLoadingMessage className="mt-6" /> : error ? (
          <p role="alert" className="mt-6 text-destructive">{error}</p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto rounded-lg border border-border bg-background">
            <Table>
              <TableHeader><TableRow>{columns.map((column) => (
                <TableHead key={column} className="whitespace-nowrap">{column}</TableHead>
              ))}</TableRow></TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow><TableCell colSpan={columns.length} data-responsive-empty className="p-8 text-center text-muted-foreground">
                    조회 결과에 해당하는 근태가 없습니다.
                  </TableCell></TableRow>
                ) : filteredRows.map((row, index) => {
                  const values = employeeCells(row);
                  const previousValues = index > 0 ? employeeCells(filteredRows[index - 1]) : null;
                  const repeated = previousValues !== null && values.every((value, column) => value === previousValues[column]);
                  return (
                    <TableRow key={row.id}>
                      {values.map((value, column) => (
                        <TableCell key={columns[column]} data-label={columns[column]} data-export-value={value}
                          className={column >= 4 ? "whitespace-nowrap" : undefined}>
                          {repeated ? "" : value}
                        </TableCell>
                      ))}
                      <TableCell data-label="출근예정일" className="whitespace-nowrap">
                        <DetailModalLink onSaved={partial.onSaved} className="text-primary underline underline-offset-4 hover:text-primary/80"
                          aria-label={`${employeeSummary(row)} ${row.workDate} 근태 상세 보기`} href={`/manager/reports/attendance/detail/${row.id}`}>
                          {row.workDate} ({weekday(row.workDate)})
                        </DetailModalLink>
                      </TableCell>
                      <TableCell data-label="출퇴근예정">
                        <DateTimeRange start={scheduledClockInDisplay(row, row.workDate)}
                          end={formatDateTimeSegment(row.scheduledClockOut, row.workDate, row.workDate)} omitMissing />
                      </TableCell>
                      <TableCell data-label="출퇴근">
                        <DateTimeRange start={formatDateTimeSegment(row.clockInDateTime, row.workDate, row.workDate)}
                          end={formatDateTimeSegment(row.clockOutDateTime, row.workDate, row.workDate)} />
                      </TableCell>
                      <TableCell data-label="근태">{[row.status, row.outtimeLabel].filter(Boolean).join(" ")}</TableCell>
                      {educationColumns.map(({ key, label }) => <TableCell key={key} data-label={label}>
                        <span className={isIncompleteEducation(row.education[key]) ? "font-semibold text-destructive" : (row.education[key] === "O" || /^\d{2}:\d{2}$/.test(row.education[key])) ? "font-semibold text-foreground" : "font-semibold text-muted-foreground"}>
                          {/^\d{2}:\d{2}$/.test(row.education[key]) ? <Link
                            className="text-primary underline underline-offset-4 hover:text-primary/80"
                            href={`/manager/safety/daily_edu?${new URLSearchParams({ name: row.employeeName, workDate: row.workDate })}`}>
                            {row.education[key]}
                          </Link> : row.education[key]}
                        </span>
                      </TableCell>)}
                      <TableCell data-label="특이사항" className="min-w-64 max-w-96 whitespace-normal break-words align-top"
                        data-export-value={row.remarks.map((remark) => `${formatSpecialRemarkDateTime(remark.reportedAt)} ${summarizeSpecialRemarkContent(remark.content)}`).join("\n") || "-"}>
                        {row.remarks.length ? <div className="space-y-3">{row.remarks.map((remark) => <div key={remark.id}>
                          <DetailModalLink onSaved={partial.onSaved} className="text-primary hover:underline" href={`/manager/inspection/special-remarks/${encodeURIComponent(remark.id)}`}>
                            {formatSpecialRemarkDateTime(remark.reportedAt)}
                          </DetailModalLink>
                          <p>{summarizeSpecialRemarkContent(remark.content)}</p>
                        </div>)}</div> : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </section>
  );
}

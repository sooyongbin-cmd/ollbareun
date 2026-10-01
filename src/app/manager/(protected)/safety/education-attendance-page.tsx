"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ManagerLoadingMessage from "../manager-loading-message";
import type {
  DailyEducationAttendanceRow,
  MonthlyEducationDetailRow,
  MonthlyEducationSummaryRow,
} from "@/lib/safety-education-attendance";

type EducationAttendanceMode = "daily" | "monthly";

function currentKstDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function currentKstYearMonth() {
  return currentKstDate().slice(0, 7);
}

function Mark({ completed }: { completed: boolean }) {
  return <span className={completed ? "font-semibold text-primary" : "text-muted-foreground"}>{completed ? "O" : "X"}</span>;
}

export default function EducationAttendancePage({ mode }: { mode: EducationAttendanceMode }) {
  const isDaily = mode === "daily";
  const [name, setName] = useState("");
  const [date, setDate] = useState(currentKstDate);
  const [yearMonth, setYearMonth] = useState(currentKstYearMonth);
  const [dailyRows, setDailyRows] = useState<DailyEducationAttendanceRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyEducationSummaryRow[]>([]);
  const [detailRows, setDetailRows] = useState<MonthlyEducationDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const loadRows = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(isDaily ? { view: "daily", date } : { view: "monthly", yearMonth });
      const response = await fetch(`/api/manager/safety-education?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "교육이수 자료를 불러오지 못했습니다.");
      if (requestId !== requestIdRef.current) return;
      if (isDaily) {
        setDailyRows(payload.rows ?? []);
      } else {
        setMonthlyRows(payload.summaryRows ?? []);
        setDetailRows(payload.detailRows ?? []);
      }
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setDailyRows([]);
      setMonthlyRows([]);
      setDetailRows([]);
      setError(loadError instanceof Error ? loadError.message : "교육이수 자료를 불러오지 못했습니다.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [date, isDaily, yearMonth]);

  useEffect(() => {
    void loadRows();
    return () => { requestIdRef.current += 1; };
  }, [loadRows]);

  const filteredDailyRows = useMemo(() => {
    const normalizedName = name.trim().toLocaleLowerCase("ko-KR");
    return dailyRows.filter((row) => row.employeeName.toLocaleLowerCase("ko-KR").includes(normalizedName));
  }, [dailyRows, name]);
  const filteredMonthlyRows = useMemo(() => {
    const normalizedName = name.trim().toLocaleLowerCase("ko-KR");
    return monthlyRows.filter((row) => row.employeeName.toLocaleLowerCase("ko-KR").includes(normalizedName));
  }, [monthlyRows, name]);
  const filteredDetailRows = useMemo(() => {
    const normalizedName = name.trim().toLocaleLowerCase("ko-KR");
    return detailRows.filter((row) => row.employeeName.toLocaleLowerCase("ko-KR").includes(normalizedName));
  }, [detailRows, name]);

  const title = isDaily ? "일별교육이수" : "월별교육이수";

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">{title}</h1>
          <p className="max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
            {isDaily ? "조회일에 근무한 직원의 안전교육 이수 여부를 확인합니다." : "조회년월에 근무한 직원의 교육 이수 현황과 일일교육 기록을 확인합니다."}
          </p>
        </div>
      </header>

      <section
        aria-label={`${title} 조회`}
        className="rounded-xl border border-border/50 bg-muted/40 p-[1.5rem] md:p-[2rem]"
      >
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); void loadRows(); }}>
          <div className="min-w-0 space-y-2">
            <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor={`${mode}-education-name`}>
              이름
            </label>
            <Input
              className="block w-full"
              id={`${mode}-education-name`}
              placeholder="이름을 입력하세요."
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <label className="ml-1 block text-[0.875rem] font-semibold text-muted-foreground" htmlFor={`${mode}-education-period`}>
              {isDaily ? "조회일" : "조회년월"}
            </label>
            <Input
              className="block w-full"
              id={`${mode}-education-period`}
              type={isDaily ? "date" : "month"}
              value={isDaily ? date : yearMonth}
              onChange={(event) => isDaily ? setDate(event.target.value) : setYearMonth(event.target.value)}
            />
          </div>
          <Button className="h-9 w-full md:w-auto" type="submit" disabled={loading}>
            조회
          </Button>
        </form>
      </section>

      {isDaily ? (
        <EducationAttendanceTable
          ariaLabel="일별교육이수 목록"
          count={filteredDailyRows.length}
          loading={loading}
          error={error}
          emptyMessage="조회 결과에 해당하는 근무자가 없습니다."
          headers={["이름", "일일", "월별", "분기", "반기"]}
        >
          {filteredDailyRows.map((row) => (
            <TableRow key={row.employeeId} className="hover:bg-muted/40 transition-colors">
              <TableCell data-label="이름" className="font-semibold">{row.employeeName}</TableCell>
              <TableCell data-label="일일"><Mark completed={row.daily} /></TableCell>
              <TableCell data-label="월별"><Mark completed={row.monthly} /></TableCell>
              <TableCell data-label="분기"><Mark completed={row.quarterly} /></TableCell>
              <TableCell data-label="반기"><Mark completed={row.semiannual} /></TableCell>
            </TableRow>
          ))}
        </EducationAttendanceTable>
      ) : (
        <>
          <EducationAttendanceTable
            ariaLabel="월별교육이수 현황"
            count={filteredMonthlyRows.length}
            loading={loading}
            error={error}
            emptyMessage="조회 결과에 해당하는 근무자가 없습니다."
            headers={["이름", "월별", "분기", "반기"]}
          >
            {filteredMonthlyRows.map((row) => (
              <TableRow key={row.employeeId} className="hover:bg-muted/40 transition-colors">
                <TableCell data-label="이름" className="font-semibold">{row.employeeName}</TableCell>
                <TableCell data-label="월별"><Mark completed={row.monthly} /></TableCell>
                <TableCell data-label="분기"><Mark completed={row.quarterly} /></TableCell>
                <TableCell data-label="반기"><Mark completed={row.semiannual} /></TableCell>
              </TableRow>
            ))}
          </EducationAttendanceTable>
          <EducationAttendanceTable
            ariaLabel="월별 일일교육이수 기록"
            count={filteredDetailRows.length}
            loading={loading}
            error={error}
            emptyMessage="조회년월에 등록된 교육이수 자료가 없습니다."
            headers={["이름", "근무일", "일일"]}
          >
            {filteredDetailRows.map((row) => (
              <TableRow key={`${row.employeeId}:${row.workDate}`} className="hover:bg-muted/40 transition-colors">
                <TableCell data-label="이름" className="font-semibold">{row.employeeName}</TableCell>
                <TableCell data-label="근무일" className="whitespace-nowrap text-muted-foreground">{row.workDate}</TableCell>
                <TableCell data-label="일일"><Mark completed={row.daily} /></TableCell>
              </TableRow>
            ))}
          </EducationAttendanceTable>
        </>
      )}
    </section>
  );
}

function EducationAttendanceTable({
  ariaLabel,
  count,
  loading,
  error,
  emptyMessage,
  headers,
  children,
}: {
  ariaLabel: string;
  count: number;
  loading: boolean;
  error: string;
  emptyMessage: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <section aria-label={ariaLabel} className="rounded-xl border border-border/50 bg-muted/40 p-[1.5rem] md:p-[2rem]">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
        <span>조회 결과 {count}</span>
      </div>
      {loading ? (
        <ManagerLoadingMessage />
      ) : error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
      ) : (
        <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
          <Table className="w-full">
            <TableHeader>
              <TableRow>{headers.map((header) => <TableHead key={header} className="text-left">{header}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {count === 0 ? (
                <TableRow>
                  <TableCell data-responsive-empty colSpan={headers.length} className="p-8 text-center text-muted-foreground italic">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : children}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

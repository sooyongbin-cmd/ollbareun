"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { educationToday } from "@/lib/education-periods";
import type { WorkerInformationRow } from "@/lib/worker-information";
import ManagerLoadingMessage from "../manager-loading-message";

const columns = [
  "구분",
  "근무지",
  "이름",
  "생년월일",
  "직군",
  "연락처",
  "출근시간",
  "퇴근시간",
  "휴무일",
  "근태",
  "안전교육(일일/월간/분기/반기/기타)",
  "특이사항",
];
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : digits.length === 10
      ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
      : value;
}
export default function WorkerInformationPage() {
  const [end, setEnd] = useState(educationToday);
  const [start, setStart] = useState(
    () => `${educationToday().slice(0, 7)}-01`,
  );
  const [period, setPeriod] = useState(() => ({ start, end }));
  const [rows, setRows] = useState<WorkerInformationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setRows([]);
      try {
        const response = await fetch(
          `/api/manager/worker-information?${new URLSearchParams(period)}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "근무자정보를 불러오지 못했습니다.");
        if (!controller.signal.aborted) setRows(data.rows ?? []);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "조회에 실패했습니다.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [period]);
  function search(event: FormEvent) {
    event.preventDefault();
    setPeriod({ start, end });
  }
  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">근무자정보조회</h1>
      </header>
      <section
        aria-label="근무자정보 검색"
        className="manager-section rounded-xl border border-border/50 bg-muted/40"
      >
        <form
          onSubmit={search}
          className="grid items-end gap-4 md:grid-cols-[1fr_auto_1fr_auto]"
        >
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-muted-foreground"
              htmlFor="worker-start"
            >
              조회 시작일
            </label>
            <Input
              id="worker-start"
              type="date"
              required
              value={start}
              max={end}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
          <span aria-hidden="true">~</span>
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-muted-foreground"
              htmlFor="worker-end"
            >
              조회 종료일
            </label>
            <Input
              id="worker-end"
              type="date"
              required
              min={start}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            조회
          </Button>
        </form>
      </section>
      <section
        aria-label="근무자정보 목록"
        className="manager-section rounded-xl border border-border/50 bg-muted/40"
      >
        <p className="text-right text-sm text-muted-foreground">
          조회 결과 {rows.length}
        </p>
        {loading ? (
          <ManagerLoadingMessage className="mt-6" />
        ) : error ? (
          <p role="alert" className="mt-6 text-destructive">
            {error}
          </p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column} className="whitespace-nowrap">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      data-responsive-empty
                      className="p-8 text-center text-muted-foreground"
                    >
                      조회 결과에 해당하는 근무자가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell data-label="구분">{index + 1}</TableCell>
                      <TableCell data-label="근무지">
                        {row.worksite || "-"}
                      </TableCell>
                      <TableCell data-label="이름">
                        <Link
                          className="font-semibold text-primary hover:underline"
                          href={`/manager/employee/employees/save/${row.id}`}
                        >
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell
                        data-label="생년월일"
                        className="whitespace-nowrap"
                      >
                        {row.birthdate.replaceAll("-", ".")}
                      </TableCell>
                      <TableCell data-label="직군">{row.role}</TableCell>
                      <TableCell
                        data-label="연락처"
                        className="whitespace-nowrap"
                      >
                        {formatPhone(row.phone)}
                      </TableCell>
                      <TableCell data-label="출근시간" className="min-w-44">
                        {row.clockIn}
                      </TableCell>
                      <TableCell data-label="퇴근시간" className="min-w-44">
                        {row.clockOut}
                      </TableCell>
                      <TableCell data-label="휴무일" className="min-w-32">
                        {row.daysOff}
                      </TableCell>
                      <TableCell data-label="근태" className="min-w-64">
                        {Object.entries(row.attendance)
                          .map(([label, count]) => `${label}(${count})`)
                          .join(", ")}
                      </TableCell>
                      <TableCell
                        data-label="안전교육(일일/월간/분기/반기/기타)"
                        className="min-w-64"
                      >
                        {row.education
                          .map((item) => `${item.completed}/${item.total}`)
                          .join(" ")}
                      </TableCell>
                      <TableCell data-label="특이사항">{row.remarks}</TableCell>
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

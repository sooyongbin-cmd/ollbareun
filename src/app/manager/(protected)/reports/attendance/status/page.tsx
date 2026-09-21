"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import ManagerLoadingMessage from "../../../manager-loading-message";

type AttendanceStatusRow = {
  id: string;
  employeeName: string;
  workStyle: string;
  worksiteName: string;
  scheduledClockIn: string;
  scheduledClockOut: string;
  clockInDateTime: string | null;
  clockOutDateTime: string | null;
  workDuration: string;
  status: "출근" | "지각" | "대기" | "결근";
};

function todayInKorea() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function AttendanceStatusPage() {
  const [date, setDate] = useState(todayInKorea);
  const [rows, setRows] = useState<AttendanceStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadStatus() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({ date });
        const response = await fetch(`/api/manager/reports/attendance/status?${params.toString()}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "출근현황을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setRows(payload.rows ?? []);
        }
      } catch (loadError) {
        if (!ignore) {
          setRows([]);
          setError(loadError instanceof Error ? loadError.message : "출근현황을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      ignore = true;
    };
  }, [date]);

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">출근현황</h1>
          <p className="max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
            날짜별 출근 예정 직원과 실제 출근 시각을 확인합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="출근현황 조회"
        className="rounded-xl border border-border/50 bg-muted/40 p-[1.5rem] md:p-[2rem]"
      >
        <div className="max-w-[18rem] space-y-2">
          <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="attendance-status-date">
            날짜
          </label>
          <Input
            id="attendance-status-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </section>

      <section
        aria-label="출근현황 목록"
        className="rounded-xl border border-border/50 bg-muted/40 p-[1.5rem] md:p-[2rem]"
      >
        <div className="flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <span>조회 결과 {rows.length}</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage className="mt-6" />
        ) : error ? (
          <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full min-w-[68rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>근무형태</TableHead>
                  <TableHead>근무지</TableHead>
                  <TableHead>출근예정</TableHead>
                  <TableHead>퇴근예정</TableHead>
                  <TableHead>출근일시</TableHead>
                  <TableHead>퇴근일시</TableHead>
                  <TableHead>근무시간</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={9} className="p-8 text-center text-muted-foreground italic">
                      출근 예정 직원이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell data-label="이름" className="font-semibold">{row.employeeName}</TableCell>
                      <TableCell data-label="근무형태" className="text-muted-foreground">{row.workStyle}</TableCell>
                      <TableCell data-label="근무지" className="text-muted-foreground">{row.worksiteName}</TableCell>
                      <TableCell data-label="출근예정">{row.scheduledClockIn}</TableCell>
                      <TableCell data-label="퇴근예정">{row.scheduledClockOut}</TableCell>
                      <TableCell data-label="출근일시">{row.clockInDateTime ?? "-"}</TableCell>
                      <TableCell data-label="퇴근일시">{row.clockOutDateTime ?? "-"}</TableCell>
                      <TableCell data-label="근무시간">{row.workDuration}</TableCell>
                      <TableCell data-label="상태">
                        <Badge
                          variant={row.status === "지각" ? "destructive" : row.status === "출근" ? "default" : "secondary"}
                        >
                          {row.status}
                        </Badge>
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

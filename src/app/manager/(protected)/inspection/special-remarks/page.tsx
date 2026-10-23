"use client";

import ListResults from "@/components/list-results";
import { formatSpecialRemarkDateTime, summarizeSpecialRemarkContent } from "@/lib/special-remark-display";

import { educationToday } from "@/lib/education-periods";
import { employeeSummary } from "@/lib/employee-summary";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

type SpecialRemarkReport = {
  id: string;
  reported_at: string;
  employee_name: string;
  worksite_name: string;
  employee_role?: string;
  work_style?: "0" | "1" | "2" | null;
  content: string;
  photo_url: string | null;
  photo_urls?: string[] | null;
  processing_status: "Y" | "N";
};

function getFirstPhotoUrl(report: Pick<SpecialRemarkReport, "photo_url" | "photo_urls">) {
  return report.photo_urls?.[0] ?? report.photo_url;
}

async function fetchReports(yearMonth: string) {
  const query = `?yearMonth=${encodeURIComponent(yearMonth)}`;
  const response = await fetch(`/api/inspection/special-remarks${query}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "특이사항 목록을 불러오지 못했습니다.");
  }

  return (payload.reports ?? []) as SpecialRemarkReport[];
}

export default function SpecialRemarksPage() {
  const [yearMonth, setYearMonth] = useState(() => educationToday().slice(0, 7));
  const [completed, setCompleted] = useState(false);
  const [reports, setReports] = useState<SpecialRemarkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const filteredReports = reports.filter((report) => (report.processing_status === "Y") === completed);

  useEffect(() => {
    let ignore = false;
    async function loadReports() {
      setLoading(true);
      setError("");
      setReports([]);
      try {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error("조회년월을 확인하세요.");
        const nextReports = await fetchReports(yearMonth);
        if (!ignore) setReports(nextReports);
      } catch (loadError) {
        if (!ignore) setError(loadError instanceof Error ? loadError.message : "특이사항 목록을 불러오지 못했습니다.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadReports();
    return () => { ignore = true; };
  }, [yearMonth]);

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">특이사항</h1>
      </header>

      <section aria-label="특이사항 검색" className="manager-section bg-muted/40 rounded-xl border border-border/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="min-w-0 flex w-full flex-col gap-2 md:w-48">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="special-remark-month">
              조회년월
            </label>
            <Input
              className="w-full"
              id="special-remark-month"
              type="month"
              onChange={(event) => setYearMonth(event.target.value)}
              value={yearMonth}
            />
          </div>
          <label className="flex min-h-10 items-center gap-2 text-sm font-semibold" htmlFor="special-remark-completed">
            <input
              id="special-remark-completed"
              type="checkbox"
              className="size-4 accent-primary"
              checked={completed}
              onChange={(event) => setCompleted(event.target.checked)}
            />
            처리완료
          </label>
        </div>
      </section>

      <section aria-label="특이사항 목록" className="manager-section bg-muted/40 rounded-xl border border-border/50">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <ListResults count={filteredReports.length} disabled={loading || Boolean(error)} />
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
                  <TableHead className="text-left">근무지</TableHead>
                  <TableHead className="text-left">이름</TableHead>
                  <TableHead className="text-left">점검일시</TableHead>
                  <TableHead className="text-left">특이사항내용</TableHead>
                  <TableHead className="text-left">첨부사진</TableHead>
                  <TableHead className="text-left">처리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={6} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 특이사항이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="근무지">{report.worksite_name || "-"}</TableCell>
                      <TableCell data-label="이름">{employeeSummary({ employeeName: report.employee_name, employeeRole: report.employee_role,
                        workStyle: report.work_style === "0" ? "일반근무" : report.work_style === "1" ? "격일근무" : report.work_style === "2" ? "야간근무" : "-" })}</TableCell>
                      <TableCell data-label="점검일시">
                        <Link
                          className="text-primary font-semibold hover:opacity-80"
                          href={`/manager/inspection/special-remarks/${encodeURIComponent(report.id)}`}
                        >
                          {formatSpecialRemarkDateTime(report.reported_at)}
                        </Link>
                      </TableCell>
                      <TableCell
                        data-label="특이사항내용"
                        className="max-w-[26.25rem] min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] align-top"
                      >
                        {summarizeSpecialRemarkContent(report.content)}
                      </TableCell>
                      <TableCell data-label="첨부사진">
                        {getFirstPhotoUrl(report) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt="첨부사진 썸네일"
                            className="h-14 w-20 rounded-[0.5rem] border border-border object-cover"
                            src={getFirstPhotoUrl(report) ?? undefined}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell data-label="처리" className="whitespace-nowrap">
                        {report.processing_status === "Y" ? "완료" : "미완료"}
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

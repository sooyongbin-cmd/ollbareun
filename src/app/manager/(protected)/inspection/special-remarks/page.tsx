"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

type SpecialRemarkReport = {
  id: string;
  reported_at: string;
  employee_name: string;
  content: string;
  photo_url: string | null;
  photo_urls?: string[] | null;
  processing_status: "Y" | "N";
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

function summarizeContent(content: string) {
  const firstLine = content.split(/\r?\n/)[0]?.trim() ?? "";
  return `${firstLine}....`;
}

function getFirstPhotoUrl(report: Pick<SpecialRemarkReport, "photo_url" | "photo_urls">) {
  return report.photo_urls?.[0] ?? report.photo_url;
}

async function fetchReports(year: string) {
  const query = year.trim() ? `?year=${encodeURIComponent(year.trim())}` : "";
  const response = await fetch(`/api/inspection/special-remarks${query}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "특이사항 목록을 불러오지 못했습니다.");
  }

  return (payload.reports ?? []) as SpecialRemarkReport[];
}

export default function SpecialRemarksPage() {
  const [year, setYear] = useState("");
  const [completed, setCompleted] = useState(false);
  const [reports, setReports] = useState<SpecialRemarkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const filteredReports = reports.filter((report) => (report.processing_status === "Y") === completed);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(async () => {
      if (year && !/^\d{4}$/.test(year)) {
        setError("조회연도는 4자리 숫자로 입력하세요.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const nextReports = await fetchReports(year);
        if (!ignore) setReports(nextReports);
      } catch (loadError) {
        if (!ignore) setError(loadError instanceof Error ? loadError.message : "특이사항 목록을 불러오지 못했습니다.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [year]);

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">특이사항</h1>
        <p className="mt-2 max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
          경비원이 보고한 특이사항과 첨부사진을 확인합니다.
        </p>
      </header>

      <section aria-label="특이사항 검색" className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="space-y-2 w-full md:max-w-[15rem]">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="special-remark-year">
              조회연도
            </label>
            <Input
              className="w-full"
              id="special-remark-year"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setYear(event.target.value)}
              placeholder="예: 2026"
              value={year}
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

      <section aria-label="특이사항 목록" className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <span>조회 결과 {filteredReports.length}</span>
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
                  <TableHead className="text-left">점검일시</TableHead>
                  <TableHead className="text-left">점검자</TableHead>
                  <TableHead className="text-left">특이사항내용</TableHead>
                  <TableHead className="text-left">첨부사진</TableHead>
                  <TableHead className="text-left">처리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={5} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 특이사항이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="점검일시">
                        <Link
                          className="text-primary font-semibold hover:opacity-80"
                          href={`/manager/inspection/special-remarks/${encodeURIComponent(report.id)}`}
                        >
                          {formatDateTime(report.reported_at)}
                        </Link>
                      </TableCell>
                      <TableCell data-label="점검자">{report.employee_name}</TableCell>
                      <TableCell data-label="특이사항내용" className="max-w-[26.25rem]">{summarizeContent(report.content)}</TableCell>
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

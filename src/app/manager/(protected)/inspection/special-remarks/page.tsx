"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

type SpecialRemarkReport = {
  id: string;
  reported_at: string;
  employee_name: string;
  content: string;
  photo_url: string | null;
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
  const [reports, setReports] = useState<SpecialRemarkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReports(nextYear = year) {
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      setReports(await fetchReports(nextYear));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "특이사항 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    fetchReports("")
      .then((nextReports) => {
        if (!ignore) {
          setReports(nextReports);
        }
      })
      .catch((loadError) => {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "특이사항 목록을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadReports(year);
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">특이사항</h1>
        <p className="mt-2 max-w-[640px] text-[21px] font-normal text-muted-foreground">
          경비원이 보고한 특이사항과 첨부사진을 확인합니다.
        </p>
      </header>

      <section aria-label="특이사항 검색" className="bg-muted/40 rounded-xl p-[32px] border border-border/50">
        <form className="flex flex-col gap-4 md:flex-row md:items-end" onSubmit={handleSearch}>
          <div className="space-y-2 w-full md:max-w-[240px]">
            <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="special-remark-year">
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
          <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 min-w-[96px]" type="submit">
            조회
          </Button>
        </form>
      </section>

      <section aria-label="특이사항 목록" className="bg-muted/40 rounded-xl p-[32px] border border-border/50">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={4} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 특이사항이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
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
                      <TableCell data-label="특이사항내용" className="max-w-[420px]">{summarizeContent(report.content)}</TableCell>
                      <TableCell data-label="첨부사진">
                        {report.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt="첨부사진 썸네일"
                            className="h-14 w-20 rounded-[8px] border border-border object-cover"
                            src={report.photo_url}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
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

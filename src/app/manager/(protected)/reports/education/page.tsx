"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { saveRowsAsXls } from "../export-xls";

type EducationReportRow = {
  employeeName: string;
  completedCount: number;
  totalCount: number;
};

function currentYear() {
  return new Date().getFullYear();
}

async function fetchEducationRows(targetYear: number) {
  const response = await fetch(`/api/manager/reports/education?year=${targetYear}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "교육이수자료를 불러오지 못했습니다.");
  }
  return (payload.rows ?? []) as EducationReportRow[];
}

export default function EducationReportPage() {
  const [year, setYear] = useState(currentYear());
  const [rows, setRows] = useState<EducationReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRows(targetYear: number) {
    setLoading(true);
    setError("");

    try {
      setRows(await fetchEducationRows(targetYear));
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "교육이수자료를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    fetchEducationRows(year)
      .then((nextRows) => {
        if (!ignore) {
          setRows(nextRows);
        }
      })
      .catch((loadError) => {
        if (!ignore) {
          setRows([]);
          setError(loadError instanceof Error ? loadError.message : "교육이수자료를 불러오지 못했습니다.");
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
  }, [year]);

  async function handleExport() {
    await saveRowsAsXls({
      fileName: `올바름_교육_전체직원_${year}`,
      headers: ["근무자", "교육이수건수/전체건수"],
      rows: rows.map((row) => [row.employeeName, `${row.completedCount}/${row.totalCount}`]),
    });
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">교육이수자료</h1>
      </header>

      <section aria-label="교육이수자료 조회" className="rounded-xl border border-border/50 bg-muted/40 p-[32px]">
        <div className="grid gap-4 md:grid-cols-[160px_auto_auto] md:items-end">
          <div className="space-y-2">
            <label className="ml-1 text-[14px] font-semibold text-muted-foreground" htmlFor="education-year">
              연도
            </label>
            <Input
              className="w-full"
              id="education-year"
              min="2000"
              max="2100"
              type="number"
              value={year}
              onChange={(event) => {
                setLoading(true);
                setError("");
                setYear(Number(event.target.value));
              }}
            />
          </div>
          <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 h-[48px]" type="button" onClick={() => loadRows(year)} disabled={loading} variant="outline">
            조회
          </Button>
          <Button className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 h-[48px]" type="button" onClick={handleExport} disabled={rows.length === 0}>
            엑셀
          </Button>
        </div>
      </section>

      <section aria-label="교육이수자료 목록" className="rounded-xl border border-border/50 bg-muted/40 p-[32px]">
        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">근무자</TableHead>
                  <TableHead className="text-left">교육이수건수/전체건수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={2} className="p-8 text-center text-muted-foreground italic">
                      조회 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.employeeName}>
                      <TableCell data-label="근무자" className="font-semibold">{row.employeeName}</TableCell>
                      <TableCell data-label="교육이수건수/전체건수">{row.completedCount}/{row.totalCount}</TableCell>
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

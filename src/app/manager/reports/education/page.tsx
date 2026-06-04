"use client";

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
      fileName: `올바른_교육_전체직원_${year}`,
      headers: ["근무자", "교육이수건수/전체건수"],
      rows: rows.map((row) => [row.employeeName, `${row.completedCount}/${row.totalCount}`]),
    });
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">교육이수자료</h1>
      </header>

      <section aria-label="교육이수자료 조회" className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[32px]">
        <div className="grid gap-4 md:grid-cols-[160px_auto_auto] md:items-end">
          <div className="space-y-2">
            <label className="ml-1 text-[14px] font-semibold text-ink-muted-48" htmlFor="education-year">
              연도
            </label>
            <input
              className="field"
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
          <button className="button-secondary h-[48px]" type="button" onClick={() => loadRows(year)} disabled={loading}>
            조회
          </button>
          <button className="button-primary h-[48px]" type="button" onClick={handleExport} disabled={rows.length === 0}>
            엑셀
          </button>
        </div>
      </section>

      <section aria-label="교육이수자료 목록" className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[32px]">
        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="status-warn">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">근무자</th>
                  <th className="text-left">교육이수건수/전체건수</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.employeeName}>
                      <td className="font-semibold">{row.employeeName}</td>
                      <td>{row.completedCount}/{row.totalCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

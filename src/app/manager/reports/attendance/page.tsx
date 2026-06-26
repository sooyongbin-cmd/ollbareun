"use client";

import { useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { saveRowsAsXls } from "../export-xls";

type AttendanceReportRow = {
  date: string;
  clockInTime: string;
  clockOutTime: string;
  workDuration: string;
};

function currentYear() {
  return new Date().getFullYear();
}

export default function AttendanceReportPage() {
  const [employeeName, setEmployeeName] = useState("");
  const [year, setYear] = useState(currentYear());
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const params = new URLSearchParams({
        employeeName: employeeName.trim(),
        year: String(year),
      });
      const response = await fetch(`/api/manager/reports/attendance?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "근태내역을 불러오지 못했습니다.");
      }
      setRows(payload.rows ?? []);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "근태내역을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    await saveRowsAsXls({
      fileName: `올바름_근태_${employeeName.trim() || "전체"}_${year}`,
      headers: ["날짜", "출근시각", "퇴근시각", "근무시간"],
      rows: rows.map((row) => [row.date, row.clockInTime, row.clockOutTime, row.workDuration]),
    });
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">근태내역</h1>
      </header>

      <section aria-label="근태내역 조회" className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[32px]">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_auto_auto] md:items-end">
          <div className="space-y-2">
            <label className="ml-1 text-[14px] font-semibold text-ink-muted-48" htmlFor="attendance-employee-name">
              직원이름
            </label>
            <input
              className="field"
              id="attendance-employee-name"
              value={employeeName}
              onChange={(event) => setEmployeeName(event.target.value)}
              placeholder="직원이름을 입력하세요."
            />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[14px] font-semibold text-ink-muted-48" htmlFor="attendance-year">
              연도
            </label>
            <input
              className="field"
              id="attendance-year"
              min="2000"
              max="2100"
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
          </div>
          <button className="button-secondary h-[48px]" type="button" onClick={handleSearch} disabled={loading}>
            조회
          </button>
          <button className="button-primary h-[48px]" type="button" onClick={handleExport} disabled={rows.length === 0}>
            엑셀
          </button>
        </div>
      </section>

      <section aria-label="근태내역 목록" className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[32px]">
        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="status-warn">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">날짜</th>
                  <th className="text-left">출근시각</th>
                  <th className="text-left">퇴근시각</th>
                  <th className="text-left">근무시간</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-ink-muted-48 italic">
                      {searched ? "조회 결과가 없습니다." : "직원이름과 연도를 입력한 뒤 조회하세요."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={`${row.date}-${row.clockInTime}`}>
                      <td>{row.date}</td>
                      <td>{row.clockInTime}</td>
                      <td>{row.clockOutTime}</td>
                      <td>{row.workDuration}</td>
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

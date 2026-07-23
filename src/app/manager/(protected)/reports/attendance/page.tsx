"use client";

import { useEffect, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { saveRowsAsXls } from "../export-xls";

type AttendanceReportRow = {
  id: string;
  clockInDateTime: string;
  clockOutDateTime: string | null;
  workDuration: string;
};

function currentYear() {
  return new Date().getFullYear();
}

function currentKstDateTimeLocal() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 16);
}

export default function AttendanceReportPage() {
  const [employeeName, setEmployeeName] = useState("");
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [employeeNamesLoading, setEmployeeNamesLoading] = useState(true);
  const [year, setYear] = useState(currentYear());
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState<AttendanceReportRow | null>(null);
  const [clockOutDateTime, setClockOutDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadEmployeeNames() {
      try {
        const response = await fetch("/api/bootstrap");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "직원 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          const names = (payload.employees ?? [])
            .filter((employee: { is_retired?: boolean }) => !employee.is_retired)
            .map((employee: { name: string }) => employee.name);
          setEmployeeNames(Array.from(new Set<string>(names)).sort((left, right) => left.localeCompare(right, "ko-KR")));
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "직원 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setEmployeeNamesLoading(false);
        }
      }
    }

    void loadEmployeeNames();

    return () => {
      ignore = true;
    };
  }, []);

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
      headers: ["출근일시", "퇴근일시", "근무시간"],
      rows: rows.map((row) => [row.clockInDateTime, row.clockOutDateTime ?? "-", row.workDuration]),
    });
  }

  function openClockOutModal(row: AttendanceReportRow) {
    setSelectedRow(row);
    setClockOutDateTime(currentKstDateTimeLocal());
    setModalError("");
  }

  function closeClockOutModal() {
    if (saving) return;
    setSelectedRow(null);
    setModalError("");
  }

  async function handleClockOutSave() {
    if (!selectedRow) return;

    setSaving(true);
    setModalError("");
    try {
      const response = await fetch("/api/manager/reports/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: selectedRow.id,
          clockOutDateTime,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "퇴근처리에 실패했습니다.");
      }

      setSelectedRow(null);
      await handleSearch();
    } catch (saveError) {
      setModalError(saveError instanceof Error ? saveError.message : "퇴근처리에 실패했습니다.");
    } finally {
      setSaving(false);
    }
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
            <select
              className="field"
              disabled={employeeNamesLoading}
              id="attendance-employee-name"
              value={employeeName}
              onChange={(event) => setEmployeeName(event.target.value)}
            >
              <option value="">{employeeNamesLoading ? "직원 목록 로딩 중..." : "전체"}</option>
              {employeeNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
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
                  <th className="text-left">출근일시</th>
                  <th className="text-left">퇴근일시</th>
                  <th className="text-left">근무시간</th>
                  <th className="text-left">퇴근처리</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td data-responsive-empty colSpan={4} className="p-8 text-center text-ink-muted-48 italic">
                      {searched ? "조회 결과가 없습니다." : "직원과 연도를 선택한 뒤 조회하세요."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td data-label="출근일시">{row.clockInDateTime}</td>
                      <td data-label="퇴근일시">{row.clockOutDateTime ?? "-"}</td>
                      <td data-label="근무시간">{row.workDuration}</td>
                      <td data-label="퇴근처리">
                        {row.clockOutDateTime ? (
                          <span className="text-ink-muted-48">완료</span>
                        ) : (
                          <button className="button-secondary h-[40px]" type="button" onClick={() => openClockOutModal(row)}>
                            퇴근처리
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedRow && (
        <div
          aria-labelledby="clock-out-modal-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-scrim px-5"
          role="dialog"
        >
          <div className="w-full max-w-[440px] rounded-[18px] border border-hairline bg-canvas p-6 shadow-product">
            <h2 className="text-[24px] font-semibold" id="clock-out-modal-title">
              퇴근처리
            </h2>
            <p className="mt-2 text-[15px] text-ink-muted-48">출근일시: {selectedRow.clockInDateTime}</p>
            <div className="mt-6 space-y-2">
              <label className="ml-1 text-[14px] font-semibold text-ink-muted-48" htmlFor="clock-out-date-time">
                퇴근일시
              </label>
              <input
                autoFocus
                className="field"
                id="clock-out-date-time"
                type="datetime-local"
                value={clockOutDateTime}
                onChange={(event) => setClockOutDateTime(event.target.value)}
              />
            </div>
            {modalError && <p className="status-warn mt-4">{modalError}</p>}
            <div className="mt-8 flex gap-3">
              <button className="button-primary flex-1" type="button" disabled={saving || !clockOutDateTime} onClick={handleClockOutSave}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button className="button-secondary flex-1" type="button" disabled={saving} onClick={closeClockOutModal}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "./manager-loading-message";

type DashboardPayload = {
  summary: {
    totalEmployees: number;
    currentlyClockedIn: number;
    educationUncompleted: number;
  };
  dailyRates: {
    date: string;
    attendanceRate: number;
    educationRate: number;
  }[];
  liveAttendance: {
    employeeName: string;
    worksiteName: string;
    clockInAt: string | null;
    educationStatus: "완료" | "미이수";
    attendanceStatus: "출근" | "퇴근";
  }[];
};

const emptyDashboard: DashboardPayload = {
  summary: {
    totalEmployees: 0,
    currentlyClockedIn: 0,
    educationUncompleted: 0,
  },
  dailyRates: [],
  liveAttendance: [],
};

function formatTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function DailyRateChart({
  title,
  data,
  valueKey,
}: {
  title: string;
  data: DashboardPayload["dailyRates"];
  valueKey: "attendanceRate" | "educationRate";
}) {
  const points = useMemo(() => {
    if (data.length === 0) {
      return "";
    }

    const width = 560;
    const height = 180;
    const left = 32;
    const right = 12;
    const top = 14;
    const bottom = 28;
    const graphWidth = width - left - right;
    const graphHeight = height - top - bottom;
    const divisor = Math.max(1, data.length - 1);

    return data
      .map((row, index) => {
        const x = left + (graphWidth * index) / divisor;
        const y = top + graphHeight - (graphHeight * row[valueKey]) / 100;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data, valueKey]);

  const latest = data.at(-1)?.[valueKey] ?? 0;

  return (
    <section className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[24px]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[24px] font-semibold">{title}</h2>
        <span className="text-[20px] font-semibold text-primary">{latest}%</span>
      </div>
      <div className="mt-4 overflow-x-auto rounded-[14px] border border-hairline bg-canvas p-3">
        {data.length === 0 ? (
          <p className="p-6 text-[15px] text-ink-muted-48">차트 자료가 없습니다.</p>
        ) : (
          <svg className="min-w-[560px]" viewBox="0 0 560 180" role="img" aria-label={`${title} 그래프`}>
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = 14 + 138 - (138 * tick) / 100;
              return (
                <g key={tick}>
                  <line x1="32" x2="548" y1={y} y2={y} stroke="#e0e0e0" strokeWidth="1" />
                  <text x="0" y={y + 4} fill="#7a7a7a" fontSize="11">
                    {tick}%
                  </text>
                </g>
              );
            })}
            <polyline fill="none" points={points} stroke="#0066cc" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            {data.map((row, index) => {
              const x = 32 + (516 * index) / Math.max(1, data.length - 1);
              const y = 14 + 138 - (138 * row[valueKey]) / 100;
              return <circle key={row.date} cx={x} cy={y} fill="#0066cc" r="3" />;
            })}
            <text x="32" y="174" fill="#7a7a7a" fontSize="11">
              {data[0]?.date}
            </text>
            <text x="490" y="174" fill="#7a7a7a" fontSize="11">
              {data.at(-1)?.date}
            </text>
          </svg>
        )}
      </div>
    </section>
  );
}

export default function ManagerPage() {
  const [data, setData] = useState<DashboardPayload>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        const response = await fetch("/api/manager/dashboard");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "대시보드 자료를 불러오지 못했습니다.");
        }
        if (!ignore) {
          setData({
            summary: payload.summary ?? emptyDashboard.summary,
            dailyRates: payload.dailyRates ?? [],
            liveAttendance: payload.liveAttendance ?? [],
          });
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "대시보드 자료를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="space-y-[32px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">관리자 대시보드</h1>
      </header>

      {loading ? (
        <ManagerLoadingMessage />
      ) : error ? (
        <p className="status-warn">{error}</p>
      ) : (
        <>
          <section aria-label="요약내용" className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[32px]">
            <p className="text-[28px] font-semibold leading-relaxed">
              전체인원 {data.summary.totalEmployees}명 현재출근 {data.summary.currentlyClockedIn}명 교육미이수{" "}
              {data.summary.educationUncompleted}명
            </p>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <DailyRateChart title="출근율 일별 차트" data={data.dailyRates} valueKey="attendanceRate" />
            <DailyRateChart title="안전교육 이수율 일별 차트" data={data.dailyRates} valueKey="educationRate" />
          </section>

          <section
            aria-label="실시간출근현황 리스트"
            className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[32px]"
          >
            <h2 className="text-[24px] font-semibold">실시간출근현황</h2>
            <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
              <table className="apple-table">
                <thead>
                  <tr>
                    <th className="text-left">성명</th>
                    <th className="text-left">현장명</th>
                    <th className="text-left">출근시간</th>
                    <th className="text-left">교육여부</th>
                    <th className="text-left">출근상태</th>
                  </tr>
                </thead>
                <tbody>
                  {data.liveAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-ink-muted-48 italic">
                        현재 출근 기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    data.liveAttendance.map((row, index) => (
                      <tr key={`${row.employeeName}-${row.clockInAt ?? index}`} className="hover:bg-canvas-parchment transition-colors">
                        <td className="font-semibold">{row.employeeName}</td>
                        <td>{row.worksiteName}</td>
                        <td>{formatTime(row.clockInAt)}</td>
                        <td>{row.educationStatus}</td>
                        <td>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${
                              row.attendanceStatus === "출근" ? "bg-primary/10 text-primary" : "bg-ink/10 text-ink-muted-48"
                            }`}
                          >
                            {row.attendanceStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

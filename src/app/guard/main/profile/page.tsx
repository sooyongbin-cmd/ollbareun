"use client";

import { useEffect, useMemo, useState } from "react";

type GuardSession = {
  employee?: {
    id?: unknown;
    name?: unknown;
  } | null;
};

type ScheduleRow = {
  id: string;
  period: string;
  worksiteName: string;
};

type MonthlyAttendanceRow = {
  yearMonth: string;
  attendanceDays: number;
  workHoursTotal: string;
};

type GuardProfilePayload = {
  schedules: ScheduleRow[];
  monthlyAttendance: MonthlyAttendanceRow[];
};

const guardSessionStorageKey = "ollbareun.guard.session";

function readGuardSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedSession = window.sessionStorage.getItem(guardSessionStorageKey);
    return storedSession ? (JSON.parse(storedSession) as GuardSession) : null;
  } catch {
    return null;
  }
}

function readGuardEmployeeId() {
  const session = readGuardSession();
  return typeof session?.employee?.id === "string" && session.employee.id.trim()
    ? session.employee.id.trim()
    : null;
}

function ProfileTableShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
      {children}
    </div>
  );
}

export default function GuardProfilePage() {
  const employeeId = useMemo(() => readGuardEmployeeId(), []);
  const [profile, setProfile] = useState<GuardProfilePayload | null>(null);
  const [loading, setLoading] = useState(Boolean(employeeId));
  const [error, setError] = useState(employeeId ? "" : "경비원 정보를 찾을 수 없습니다. 다시 로그인하세요.");

  useEffect(() => {
    if (!employeeId) {
      return;
    }

    let ignore = false;
    const guardEmployeeId = employeeId;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/guard/profile?employeeId=${encodeURIComponent(guardEmployeeId)}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "개인프로필을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setProfile({
            schedules: payload.schedules ?? [],
            monthlyAttendance: payload.monthlyAttendance ?? [],
          });
        }
      } catch (loadError) {
        if (!ignore) {
          setProfile(null);
          setError(loadError instanceof Error ? loadError.message : "개인프로필을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [employeeId]);

  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[56px]">
      <div className="max-w-[760px] mx-auto space-y-6">
        <header>
          <h1 className="text-[40px] font-semibold leading-[1.1]">개인프로필</h1>
        </header>

        {error ? <p className="status-warn">{error}</p> : null}
        {loading ? <p className="status-ok">개인프로필을 불러오는 중입니다...</p> : null}

        <section
          aria-label="근무스케줄"
          className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[32px]"
        >
          <h2 className="text-[24px] font-semibold">근무스케줄</h2>
          <ProfileTableShell>
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">기간</th>
                  <th className="text-left">근무지</th>
                </tr>
              </thead>
              <tbody>
                {!loading && (profile?.schedules.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-ink-muted-48 italic">
                      근무스케줄이 없습니다.
                    </td>
                  </tr>
                ) : (
                  profile?.schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td>{schedule.period}</td>
                      <td>{schedule.worksiteName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ProfileTableShell>
        </section>

        <section
          aria-label="월별출근현황"
          className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[32px]"
        >
          <h2 className="text-[24px] font-semibold">월별출근현황</h2>
          <ProfileTableShell>
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">연월</th>
                  <th className="text-left">출근일수</th>
                  <th className="text-left">근무시간합</th>
                </tr>
              </thead>
              <tbody>
                {!loading && (profile?.monthlyAttendance.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-ink-muted-48 italic">
                      최근 1년 출근현황이 없습니다.
                    </td>
                  </tr>
                ) : (
                  profile?.monthlyAttendance.map((row) => (
                    <tr key={row.yearMonth}>
                      <td>{row.yearMonth}</td>
                      <td>{row.attendanceDays}일</td>
                      <td>{row.workHoursTotal}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ProfileTableShell>
        </section>
      </div>
    </div>
  );
}

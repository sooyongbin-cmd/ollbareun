"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { canClockIn, canClockOut, type AttendanceRecord, type Worksite } from "@/lib/phase1";
import { type GpsInfo } from "@/lib/gps";
import AttendanceMapSection from "./attendance-map-section";

type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
  is_retired: boolean;
};

type WorksiteRow = {
  id: string;
  name: string;
  gps_info: GpsInfo;
  radius_meters: number;
};

type AssignmentRow = {
  id: string;
  employee_id: string;
  worksite_id: string;
  start_date: string;
  end_date: string;
};

type AttendanceRow = {
  id: string;
  employee_id: string;
  worksite_id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
};

type GuardSession = {
  employee: EmployeeRow;
  assignment: AssignmentRow | null;
  worksite: WorksiteRow | null;
  attendance: AttendanceRow | null;
};

const guardSessionStorageKey = "ollbareun.guard.session";

function asWorksite(row: WorksiteRow): Worksite {
  return {
    id: row.id,
    name: row.name,
    latitude: row.gps_info.latitude,
    longitude: row.gps_info.longitude,
    radiusMeters: row.radius_meters,
  };
}

function asAttendance(row: AttendanceRow | null): AttendanceRecord | null {
  if (!row?.clock_in_at) {
    return null;
  }

  return {
    id: row.id,
    employeeId: row.employee_id,
    worksiteId: row.worksite_id,
    clockInAt: row.clock_in_at,
    clockOutAt: row.clock_out_at,
  };
}

function readStoredGuardSession(): GuardSession | null {
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

function writeStoredGuardSession(session: GuardSession) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(guardSessionStorageKey, JSON.stringify(session));
  } catch {
    // Keep the current screen usable even if session storage is unavailable.
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  }

  return payload as T;
}

export default function GuardAttendancePage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [guard, setGuard] = useState<GuardSession | null>(readStoredGuardSession);
  const [latitude, setLatitude] = useState(() => (guard?.worksite ? String(guard.worksite.gps_info.latitude) : ""));
  const [longitude, setLongitude] = useState(() => (guard?.worksite ? String(guard.worksite.gps_info.longitude) : ""));

  const clockInDecision =
    guard?.worksite && latitude && longitude
      ? canClockIn({
          worksite: asWorksite(guard.worksite),
          currentLatitude: Number(latitude),
          currentLongitude: Number(longitude),
        })
      : {
          allowed: false,
          reason: guard?.worksite ? "현재 위치를 입력하거나 확인하세요." : "오늘 배정된 근무지가 없습니다.",
        };

  const clockOutDecision = canClockOut(asAttendance(guard?.attendance ?? null));

  useEffect(() => {
    const geolocation = navigator.geolocation;

    if (!geolocation) {
      queueMicrotask(() => setError("이 브라우저에서는 위치 확인을 사용할 수 없습니다."));
      return;
    }

    geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
      },
      () => setError("현재 위치를 확인하지 못했습니다."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  async function handleClockIn() {
    if (!guard?.employee || !guard.worksite) {
      return;
    }

    setError("");
    const result = await postJson<{ attendance: AttendanceRow }>("/api/attendance/clock-in", {
      employeeId: guard.employee.id,
      worksiteId: guard.worksite.id,
      latitude,
      longitude,
    });
    const nextGuard = { ...guard, attendance: result.attendance };
    setGuard(nextGuard);
    writeStoredGuardSession(nextGuard);
    setMessage("출근 처리되었습니다.");
  }

  async function handleClockOut() {
    if (!guard?.employee) {
      return;
    }

    setError("");
    const result = await postJson<{ attendance: AttendanceRow }>("/api/attendance/clock-out", {
      employeeId: guard.employee.id,
      latitude: latitude || guard.worksite?.gps_info.latitude,
      longitude: longitude || guard.worksite?.gps_info.longitude,
    });
    const nextGuard = { ...guard, attendance: result.attendance };
    setGuard(nextGuard);
    writeStoredGuardSession(nextGuard);
    setMessage("퇴근 처리되었습니다.");
  }

  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[80px]">
      <div className="max-w-[600px] mx-auto">
        {guard ? (
          <section className="bg-canvas-parchment rounded-[18px] p-[16px] border border-hairline/50">
            <div className="space-y-[32px]">
              <AttendanceMapSection
                currentLatitude={latitude}
                currentLongitude={longitude}
                worksite={guard.worksite}
              />

              <div
                className={`p-4 rounded-xl text-center text-[15px] font-medium transition-colors ${
                  clockInDecision.allowed ? "bg-primary/5 text-primary" : "bg-status-warn text-ink"
                }`}
                id="attendance-decision-section"
              >
                {clockInDecision.reason}
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3" id="attendance-actions-section">
                <button
                  className="button-primary"
                  data-testid="clock-in"
                  type="button"
                  disabled={!clockInDecision.allowed || !!guard.attendance?.clock_in_at}
                  onClick={handleClockIn}
                >
                  출근
                </button>
                <button
                  className="button-secondary"
                  data-testid="clock-out"
                  type="button"
                  disabled={!clockOutDecision.allowed}
                  onClick={handleClockOut}
                >
                  퇴근
                </button>
              </div>

              {message ? <p className="status-ok text-center">{message}</p> : null}
              {error ? <p className="status-warn text-center">{error}</p> : null}
            </div>
          </section>
        ) : (
          <section
            className="bg-canvas-parchment rounded-[18px] p-[16px] border border-hairline/50 text-center"
            id="attendance-auth-required-section"
          >
            <p className="text-[17px] text-ink-muted-48">경비원 인증 후 이용할 수 있습니다.</p>
            <Link className="button-primary mt-6 inline-flex" href="/guard">
              인증하러 가기
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

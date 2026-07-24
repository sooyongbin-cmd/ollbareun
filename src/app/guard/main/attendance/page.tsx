"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { canClockIn, canClockOut, canClockOutAtWorksite, type AttendanceRecord, type Worksite } from "@/lib/phase1";
import { type GpsInfo } from "@/lib/gps";
import AttendanceMapSection from "./attendance-map-section";
import GuardLocationPermissionPrompt from "../guard-location-permission-prompt";
import { locationPermissionGrantedEvent, queryGeolocationPermission } from "../location-permission";
import { readStoredGuardSession as readGuardSessionFromStorage, writeStoredGuardSession as writeGuardSessionToStorage } from "../../guard-session-storage";

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

const geolocationOptions: PositionOptions = { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 };

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
  return readGuardSessionFromStorage<GuardSession>({ touch: true });
}

function writeStoredGuardSession(session: GuardSession) {
  writeGuardSessionToStorage(session);
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

function readCurrentPosition(geolocation: Geolocation): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(resolve, reject, geolocationOptions);
  });
}

export default function GuardAttendancePage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [guard, setGuard] = useState<GuardSession | null>(readStoredGuardSession);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

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

  const attendance = asAttendance(guard?.attendance ?? null);
  const attendanceClockOutDecision = canClockOut(attendance);
  const clockOutDecision =
    attendanceClockOutDecision.allowed && guard?.worksite && latitude && longitude
      ? canClockOutAtWorksite({
          attendance,
          worksite: asWorksite(guard.worksite),
          currentLatitude: Number(latitude),
          currentLongitude: Number(longitude),
        })
      : attendanceClockOutDecision.allowed
        ? {
            allowed: false,
            reason: guard?.worksite ? "현재 위치를 입력하거나 확인하세요." : "오늘 배정된 근무지가 없습니다.",
          }
        : attendanceClockOutDecision;
  const activeDecision = guard?.attendance?.clock_in_at ? clockOutDecision : clockInDecision;

  useEffect(() => {
    const geolocation = navigator.geolocation;
    let watchId: number | null = null;
    let isMounted = true;

    if (!geolocation) {
      queueMicrotask(() => setError("이 브라우저에서는 위치 확인을 사용할 수 없습니다."));
      return;
    }

    async function startWatchingPosition() {
      const permissionState = await queryGeolocationPermission();
      if (!isMounted || watchId !== null) {
        return;
      }

      if (permissionState === "denied" || permissionState === "prompt") {
        setError("위치 권한을 허용해주세요.");
        return;
      }

      watchId = geolocation.watchPosition(
        (position) => {
          setLatitude(String(position.coords.latitude));
          setLongitude(String(position.coords.longitude));
          setError("");
        },
        () => setError("현재 위치를 확인하지 못했습니다."),
        geolocationOptions,
      );
    }

    function handleLocationPermissionGranted() {
      void startWatchingPosition();
    }

    window.addEventListener(locationPermissionGrantedEvent, handleLocationPermissionGranted);
    void startWatchingPosition();

    return () => {
      isMounted = false;
      window.removeEventListener(locationPermissionGrantedEvent, handleLocationPermissionGranted);
      if (watchId !== null) {
        geolocation.clearWatch(watchId);
      }
    };
  }, []);

  async function handleClockIn() {
    const activeGuard = readStoredGuardSession();
    if (!activeGuard?.employee || !activeGuard.worksite) {
      setGuard(activeGuard);
      return;
    }

    const geolocation = navigator.geolocation;
    if (!geolocation) {
      setError("이 브라우저에서는 위치 확인을 사용할 수 없습니다.");
      return;
    }

    try {
      setError("");
      const position = await readCurrentPosition(geolocation);
      const nextLatitude = String(position.coords.latitude);
      const nextLongitude = String(position.coords.longitude);

      setLatitude(nextLatitude);
      setLongitude(nextLongitude);

      const result = await postJson<{ attendance: AttendanceRow }>("/api/attendance/clock-in", {
        employeeId: activeGuard.employee.id,
        worksiteId: activeGuard.worksite.id,
        latitude: nextLatitude,
        longitude: nextLongitude,
      });
      const nextGuard = { ...activeGuard, attendance: result.attendance };
      setGuard(nextGuard);
      writeStoredGuardSession(nextGuard);
      setMessage("출근 처리되었습니다.");
    } catch (clockInError) {
      setError(clockInError instanceof Error ? clockInError.message : "출근 처리에 실패했습니다.");
    }
  }

  async function handleClockOut() {
    const activeGuard = readStoredGuardSession();
    if (!activeGuard?.employee || !activeGuard.worksite) {
      setGuard(activeGuard);
      return;
    }

    const geolocation = navigator.geolocation;
    if (!geolocation) {
      setError("이 브라우저에서는 위치 확인을 사용할 수 없습니다.");
      return;
    }

    try {
      setError("");
      const position = await readCurrentPosition(geolocation);
      const nextLatitude = String(position.coords.latitude);
      const nextLongitude = String(position.coords.longitude);
      const decision = canClockOutAtWorksite({
        attendance: asAttendance(activeGuard.attendance),
        worksite: asWorksite(activeGuard.worksite),
        currentLatitude: position.coords.latitude,
        currentLongitude: position.coords.longitude,
      });

      setLatitude(nextLatitude);
      setLongitude(nextLongitude);

      if (!decision.allowed) {
        setError(decision.reason);
        return;
      }

      const result = await postJson<{ attendance: AttendanceRow }>("/api/attendance/clock-out", {
        employeeId: activeGuard.employee.id,
        latitude: nextLatitude,
        longitude: nextLongitude,
      });
      const nextGuard = { ...activeGuard, attendance: result.attendance };
      setGuard(nextGuard);
      writeStoredGuardSession(nextGuard);
      setMessage("퇴근 처리되었습니다.");
    } catch (clockOutError) {
      setError(clockOutError instanceof Error ? clockOutError.message : "퇴근 처리에 실패했습니다.");
    }
  }

  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[80px]">
      <div className="max-w-[600px] mx-auto">
        {guard ? (
          <section className="bg-muted/40 rounded-xl p-[16px] border border-border/50">
            <div className="space-y-[32px]">
              <AttendanceMapSection
                currentLatitude={latitude}
                currentLongitude={longitude}
                worksite={guard.worksite}
              />

              <div
                className={`p-4 rounded-xl text-center text-[15px] font-medium transition-colors ${
                  activeDecision.allowed ? "bg-primary/5 text-primary" : "bg-destructive text-foreground"
                }`}
                id="attendance-decision-section"
              >
                {activeDecision.reason}
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3" id="attendance-actions-section">
                <Button
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  data-testid="clock-in"
                  type="button"
                  disabled={!clockInDecision.allowed || !!guard.attendance?.clock_in_at}
                  onClick={handleClockIn}
                >
                  출근
                </Button>
                <Button
                  data-testid="clock-out"
                  type="button"
                  disabled={!clockOutDecision.allowed}
                  onClick={handleClockOut}
                  variant="outline"
                >
                  퇴근
                </Button>
              </div>

              {message ? <p className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground text-center">{message}</p> : null}
              {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">{error}</p> : null}
              <GuardLocationPermissionPrompt />
            </div>
          </section>
        ) : (
          <section
            className="bg-muted/40 rounded-xl p-[16px] border border-border/50 text-center"
            id="attendance-auth-required-section"
          >
            <p className="text-[17px] text-muted-foreground">현장 근로자 인증 후 이용할 수 있습니다.</p>
            <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 mt-6 inline-flex" href="/guard">
              인증하러 가기
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

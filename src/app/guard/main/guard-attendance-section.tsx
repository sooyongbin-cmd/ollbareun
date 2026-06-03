"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { distanceMeters, canClockIn, canClockOut, type AttendanceRecord, type Worksite } from "@/lib/phase1";
import type { GpsInfo } from "@/lib/gps";
import AlertModal from "@/components/modals/alert-modal";

type EmployeeRow = {
  id: string;
  name: string;
};

type AttendanceRow = {
  id: string;
  employee_id: string;
  worksite_id: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
};

type WorksiteRow = {
  id: string;
  name: string;
  gps_info: GpsInfo;
  radius_meters: number;
};

type GuardSession = {
  employee?: EmployeeRow | null;
  attendance?: AttendanceRow | null;
  worksite?: WorksiteRow | null;
};

const guardSessionStorageKey = "ollbareun.guard.session";

function readGuardSessionSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(guardSessionStorageKey);
  } catch {
    return null;
  }
}

function subscribeToSessionChange(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", (event) => {
    if (event.key === guardSessionStorageKey) onStoreChange();
  });
  return () => {};
}

function formatTime(isoString: string | null | undefined) {
  if (!isoString) return "-";
  try {
    return new Date(isoString).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  return payload as T;
}

export default function GuardAttendanceSection() {
  const storedSession = useSyncExternalStore(subscribeToSessionChange, readGuardSessionSnapshot, () => null);
  
  const [currentGps, setCurrentGps] = useState<GpsInfo | null>(null);
  const [locError, setLocError] = useState("");
  const [localAttendance, setLocalAttendance] = useState<AttendanceRow | null>(null);
  const [alertInfo, setAlertMessage] = useState<{ title: string; message: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const session = useMemo(() => {
    if (!storedSession) return null;
    try {
      return JSON.parse(storedSession) as GuardSession;
    } catch {
      return null;
    }
  }, [storedSession]);

  const attendance = localAttendance ?? session?.attendance ?? null;

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      queueMicrotask(() => setLocError("위치 확인 불가"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setLocError("위치 확인 실패"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const distance =
    currentGps && session?.worksite?.gps_info
      ? distanceMeters(
          currentGps.latitude,
          currentGps.longitude,
          session.worksite.gps_info.latitude,
          session.worksite.gps_info.longitude,
        )
      : null;

  async function handleClockIn() {
    if (!session?.employee || !session.worksite || processing) return;

    const worksite: Worksite = {
      id: session.worksite.id,
      name: session.worksite.name,
      latitude: session.worksite.gps_info.latitude,
      longitude: session.worksite.gps_info.longitude,
      radiusMeters: session.worksite.radius_meters,
    };

    const decision = canClockIn({
      worksite,
      currentLatitude: currentGps?.latitude ?? 0,
      currentLongitude: currentGps?.longitude ?? 0,
    });

    if (!decision.allowed) {
      setAlertMessage({ title: "출근 불가", message: decision.reason });
      return;
    }

    try {
      setProcessing(true);
      const result = await postJson<{ attendance: AttendanceRow }>("/api/attendance/clock-in", {
        employeeId: session.employee.id,
        worksiteId: session.worksite.id,
        latitude: currentGps?.latitude,
        longitude: currentGps?.longitude,
      });
      
      const nextSession = { ...session, attendance: result.attendance };
      window.sessionStorage.setItem(guardSessionStorageKey, JSON.stringify(nextSession));
      setLocalAttendance(result.attendance);
      setAlertMessage({ title: "알림", message: "출근 처리되었습니다." });
    } catch (err) {
      setAlertMessage({ title: "오류", message: err instanceof Error ? err.message : "출근 처리 실패" });
    } finally {
      setProcessing(false);
    }
  }

  async function handleClockOut() {
    if (!session?.employee || !attendance || processing) return;

    const record: AttendanceRecord = {
      id: attendance.id,
      employeeId: attendance.employee_id,
      worksiteId: attendance.worksite_id,
      clockInAt: attendance.clock_in_at!,
      clockOutAt: attendance.clock_out_at,
    };

    const decision = canClockOut(record);
    if (!decision.allowed) {
      setAlertMessage({ title: "퇴근 불가", message: decision.reason });
      return;
    }

    try {
      setProcessing(true);
      const result = await postJson<{ attendance: AttendanceRow }>("/api/attendance/clock-out", {
        employeeId: session.employee.id,
        latitude: currentGps?.latitude ?? session.worksite?.gps_info?.latitude,
        longitude: currentGps?.longitude ?? session.worksite?.gps_info?.longitude,
      });
      
      const nextSession = { ...session, attendance: result.attendance };
      window.sessionStorage.setItem(guardSessionStorageKey, JSON.stringify(nextSession));
      setLocalAttendance(result.attendance);
      setAlertMessage({ title: "알림", message: "퇴근 처리되었습니다." });
    } catch (err) {
      setAlertMessage({ title: "오류", message: err instanceof Error ? err.message : "퇴근 처리 실패" });
    } finally {
      setProcessing(false);
    }
  }

  const isClockedIn = !!attendance?.clock_in_at;
  const isClockedOut = !!attendance?.clock_out_at;

  return (
    <section className="mb-6 bg-canvas rounded-[18px] p-6 border border-hairline shadow-sm space-y-5">
      <h3 className="text-[14px] font-semibold text-ink-muted-48">출근 상황</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[12px] text-ink-muted-48">출근 시각</p>
          <p className="text-[20px] font-bold text-ink">{formatTime(attendance?.clock_in_at)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[12px] text-ink-muted-48">퇴근 시각</p>
          <p className="text-[20px] font-bold text-ink">{formatTime(attendance?.clock_out_at)}</p>
        </div>
      </div>

      <div className="space-y-2 border-t border-hairline/30 pt-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-ink-muted-48 font-semibold">근무지와의 거리</span>
          <span className={`font-bold ${distance !== null && distance > (session?.worksite?.radius_meters ?? 100) ? "text-status-warn" : "text-primary"}`}>
            {distance !== null ? `${Math.round(distance)}m` : locError || "위치 확인 중..."}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-hairline/30 grid grid-cols-2 gap-3">
        <button
          onClick={handleClockIn}
          disabled={isClockedIn || processing}
          className={`${!isClockedIn ? 'button-primary' : 'button-secondary'} flex w-full justify-center text-center disabled:opacity-50`}
        >
          {processing && !isClockedIn ? "처리 중..." : "출근하기"}
        </button>
        
        <button
          onClick={handleClockOut}
          disabled={!isClockedIn || isClockedOut || processing}
          className={`${isClockedIn && !isClockedOut ? 'button-primary' : 'button-secondary'} flex w-full justify-center text-center disabled:opacity-50`}
        >
          {processing && isClockedIn && !isClockedOut ? "처리 중..." : "퇴근하기"}
        </button>
      </div>

      {isClockedOut && (
        <p className="text-[13px] text-ink-muted-48 font-medium text-center">
          오늘의 근무가 모두 완료되었습니다.
        </p>
      )}

      <AlertModal
        isOpen={Boolean(alertInfo)}
        onClose={() => setAlertMessage(null)}
        title={alertInfo?.title ?? "알림"}
        description={alertInfo?.message ?? ""}
      />
    </section>
  );
}

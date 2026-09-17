"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { canClockIn, canClockOut, canClockOutAtWorksite, type AttendanceRecord, type Worksite } from "@/lib/phase1";
import { type GpsInfo } from "@/lib/gps";
import { getAttendanceStatus } from "../attendance-status";
import { subscribeToGuardSessionChange } from "../../guard-session-storage";
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
  isDayOff?: boolean;
  employee: EmployeeRow;
  assignment: AssignmentRow | null;
  worksite: WorksiteRow | null;
  attendance: AttendanceRow | null;
};

type AttendanceViewState = "pending" | "ready" | "outside" | "working" | "complete" | "unavailable";

type AttendanceStatusCopy = {
  state: AttendanceViewState;
  title: string;
  description: string;
  isOutside: boolean;
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

function formatAttendanceTime(value: string | null | undefined) {
  if (!value) return "미등록";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "미등록";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getAttendanceStatusCopy({
  guard,
  isClockedIn,
  isClockedOut,
  hasLocation,
  locationError,
  activeDecisionAllowed,
}: {
  guard: GuardSession | null;
  isClockedIn: boolean;
  isClockedOut: boolean;
  hasLocation: boolean;
  locationError: string;
  activeDecisionAllowed: boolean;
}): AttendanceStatusCopy {
  if (!guard?.worksite) {
    return {
      state: "unavailable",
      title: "근무지 미배정",
      description: "오늘 배정된 근무지가 없어 출퇴근할 수 없습니다.",
      isOutside: false,
    };
  }

  if (guard.isDayOff && !isClockedIn && !isClockedOut) {
    return {
      state: "unavailable",
      title: "오늘은 휴무일입니다",
      description: "휴무일에는 출근할 수 없습니다.",
      isOutside: false,
    };
  }

  if (isClockedOut) {
    return {
      state: "complete",
      title: "금일 근무 종료",
      description: "퇴근 GPS 인증이 완료되었습니다.",
      isOutside: false,
    };
  }

  if (!hasLocation) {
    return {
      state: "pending",
      title: "현재 위치 확인 중",
      description: locationError || "출퇴근을 위해 현재 위치를 확인하고 있습니다.",
      isOutside: false,
    };
  }

  const radius = `${guard.worksite.radius_meters}m`;
  if (isClockedIn) {
    if (activeDecisionAllowed) {
      return {
        state: "working",
        title: "현재 위치 인증 완료 (근무 중)",
        description: `근무지 반경 (${radius}) 이내 정상 위치 확인됨`,
        isOutside: false,
      };
    }

    return {
      state: "outside",
      title: "근무지 반경 이탈 상태",
      description: `근무지 반경(${radius})이내에서만 퇴근이 가능합니다`,
      isOutside: true,
    };
  }

  if (activeDecisionAllowed) {
    return {
      state: "ready",
      title: `근무지 반경 ${radius} 이내 위치`,
      description: "출근 인증 대기 중",
      isOutside: false,
    };
  }

  return {
    state: "outside",
    title: "근무지 반경 이탈 상태",
    description: `근무지 반경(${radius})이내에서만 출근이 가능합니다`,
    isOutside: true,
  };
}

export default function GuardAttendancePage() {
  const router = useRouter();
  const processingRef = useRef(false);
  const [process, setProcess] = useState<{
    action: "출근" | "퇴근";
    status: "processing" | "success" | "error";
    error: string;
  } | null>(null);
  const [encouragement, setEncouragement] = useState("");
  const isProcessing = process?.status === "processing";
  const [error, setError] = useState("");
  const [guard, setGuard] = useState<GuardSession | null>(readStoredGuardSession);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  useEffect(() => subscribeToGuardSessionChange(() => setGuard(readGuardSessionFromStorage<GuardSession>())), []);

  const attendanceStatus = getAttendanceStatus(guard?.attendance);
  const isClockedIn = attendanceStatus.isOpen;
  const isClockedOut = attendanceStatus.clockedOutToday;
  const hasLocation = Boolean(latitude.trim() && longitude.trim());
  const clockInDecision =
    guard?.isDayOff
      ? {
          allowed: false,
          reason: "오늘은 휴무일로 지정되어 출근할 수 없습니다.",
        }
      : guard?.worksite && hasLocation
        ? canClockIn({
            worksite: asWorksite(guard.worksite),
            currentLatitude: Number(latitude),
            currentLongitude: Number(longitude),
          })
        : {
            allowed: false,
            reason: guard?.worksite ? "현재 위치를 확인중입니다...." : "오늘 배정된 근무지가 없습니다.",
          };

  const attendance = asAttendance(guard?.attendance ?? null);
  const attendanceClockOutDecision = canClockOut(attendance);
  const clockOutDecision =
    attendanceClockOutDecision.allowed && guard?.worksite && hasLocation
      ? canClockOutAtWorksite({
          attendance,
          worksite: asWorksite(guard.worksite),
          currentLatitude: Number(latitude),
          currentLongitude: Number(longitude),
        })
      : attendanceClockOutDecision.allowed
        ? {
            allowed: false,
            reason: guard?.worksite ? "현재 위치를 확인중입니다...." : "오늘 배정된 근무지가 없습니다.",
          }
        : attendanceClockOutDecision;

  const activeDecision = isClockedIn || isClockedOut ? clockOutDecision : clockInDecision;
  const statusCopy = getAttendanceStatusCopy({
    guard,
    isClockedIn,
    isClockedOut,
    hasLocation,
    locationError: error,
    activeDecisionAllowed: activeDecision.allowed,
  });
  const actionDisabled = isProcessing || statusCopy.state === "unavailable" || statusCopy.state === "pending" || statusCopy.isOutside;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/system/configs/system_0001", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!controller.signal.aborted && typeof data?.config?.content === "string") {
          setEncouragement(data.config.content.trim());
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

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

  async function handleAttendance(action: "출근" | "퇴근") {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcess({ action, status: "processing", error: "" });
    setError("");

    try {
      const activeGuard = readStoredGuardSession();
      if (!activeGuard?.employee || !activeGuard.worksite) {
        setGuard(activeGuard);
        throw new Error("로그인 정보 또는 배정된 근무지를 확인할 수 없습니다.");
      }

      const currentLatitude = Number(latitude);
      const currentLongitude = Number(longitude);
      if (!hasLocation || !Number.isFinite(currentLatitude) || !Number.isFinite(currentLongitude)) {
        throw new Error("현재 위치를 확인하지 못했습니다. 위치 권한과 GPS 상태를 확인한 뒤 다시 시도해주세요.");
      }

      if (action === "출근") {
        const decision = canClockIn({
          worksite: asWorksite(activeGuard.worksite),
          currentLatitude,
          currentLongitude,
        });
        if (!decision.allowed) throw new Error(decision.reason);
      } else {
        const decision = canClockOutAtWorksite({
          attendance: asAttendance(activeGuard.attendance),
          worksite: asWorksite(activeGuard.worksite),
          currentLatitude,
          currentLongitude,
        });
        if (!decision.allowed) throw new Error(decision.reason);
      }

      const result = await postJson<{ attendance: AttendanceRow }>(
        action === "출근" ? "/api/attendance/clock-in" : "/api/attendance/clock-out",
        {
          employeeId: activeGuard.employee.id,
          ...(action === "출근" ? { worksiteId: activeGuard.worksite.id } : {}),
          latitude,
          longitude,
        },
      );

      const nextGuard = { ...activeGuard, attendance: result.attendance };
      setGuard(nextGuard);
      writeStoredGuardSession(nextGuard);
      setProcess({ action, status: "success", error: "" });
    } catch (attendanceError) {
      const detail = attendanceError instanceof Error ? attendanceError.message : action + " 처리에 실패했습니다.";
      setProcess((current) => current ? { ...current, status: "error", error: detail } : current);
    } finally {
      processingRef.current = false;
    }
  }

  function handleProcessConfirm() {
    if (!process || process.status === "processing") return;
    const isCompleted = process.status === "success";
    setProcess(null);
    if (isCompleted) {
      router.push("/guard/main");
    }
  }

  if (!guard) {
    return (
      <div className="guard-attendance-page">
        <section className="guard-attendance-card guard-attendance-auth-card" id="attendance-auth-required-section">
          <p>현장 근로자 인증 후 이용할 수 있습니다.</p>
          <Link className="guard-attendance-action-button is-primary" href="/guard">
            인증하러 가기
          </Link>
        </section>
      </div>
    );
  }

  const clockInTime = guard.attendance?.clock_in_at
    ? formatAttendanceTime(guard.attendance.clock_in_at)
    : "미등록 (출근 전)";
  const clockOutTime = formatAttendanceTime(guard.attendance?.clock_out_at);
  const worksiteName = guard.worksite?.name ?? "근무지 미배정";

  return (
    <div className="guard-attendance-page">
      <section aria-label="출퇴근" className="guard-attendance-card">
        <div className="guard-attendance-heading">
          <h1>출퇴근</h1>
          <p>{worksiteName}</p>
        </div>

        <AttendanceMapSection
          currentLatitude={latitude}
          currentLongitude={longitude}
          worksite={guard.worksite}
        />

        <div
          aria-live="polite"
          className={`guard-attendance-status-box is-${statusCopy.state}`}
          id="attendance-decision-section"
          role="status"
        >
          <p>{statusCopy.title}</p>
          <p>{statusCopy.description}</p>
          {!activeDecision.allowed ? <span className="guard-sr-only">{activeDecision.reason}</span> : null}
        </div>

        <div className="guard-attendance-times" id="attendance-record-section">
          <div>
            <span>∙ 출근시각 : </span>
            <strong>{clockInTime}</strong>
          </div>
          <div>
            <span>∙ 퇴근시각 : </span>
            <strong>{clockOutTime}</strong>
          </div>
        </div>

        <div id="attendance-actions-section">
          <button
            aria-label="출근하기"
            className={`guard-attendance-action-button is-primary ${actionDisabled ? "is-disabled" : ""}`}
            data-testid="clock-in"
            disabled={actionDisabled}
            hidden={isClockedIn || isClockedOut}
            type="button"
            onClick={() => void handleAttendance("출근")}
          >
            {isProcessing && !isClockedIn ? "처리 중..." : "출근하기"}
          </button>
          <button
            aria-label="퇴근하기"
            className={`guard-attendance-action-button is-working ${actionDisabled ? "is-disabled" : ""}`}
            data-testid="clock-out"
            disabled={actionDisabled}
            hidden={!isClockedIn}
            type="button"
            onClick={() => void handleAttendance("퇴근")}
          >
            {isProcessing && isClockedIn ? "처리 중..." : "퇴근하기"}
          </button>
          <button
            aria-label="금일 근무 완료"
            className="guard-attendance-action-button is-complete is-disabled"
            data-testid="attendance-complete"
            disabled
            hidden={!isClockedOut}
            type="button"
          >
            금일 근무 완료
          </button>
        </div>
      </section>

      {error ? <p className="guard-attendance-error">{error}</p> : null}
      <GuardLocationPermissionPrompt />

      <Dialog open={process !== null}>
        <DialogContent
          className="guard-attendance-dialog"
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="guard-attendance-dialog-header">
            <DialogTitle className="guard-attendance-dialog-title">
              {process?.status === "success" && process.action === "출근" ? "출근 완료" : `${process?.action ?? "출퇴근"} 처리`}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription aria-live="polite" className="guard-attendance-dialog-copy">
            {process?.status === "success" ? (
              <>
                <span>{process.action === "출근" ? (encouragement || "오늘도 안전한 근무되세요") : "오늘도 안전한 근무되세요"}</span>
                <span>{process.action} 처리가 완료 되었습니다</span>
              </>
            ) : process?.status === "error" ? (
              <span>{process.action} 처리에 실패했습니다.</span>
            ) : (
              <span>{process?.action ?? "출퇴근"} 처리중입니다...</span>
            )}
          </DialogDescription>
          {process?.status === "error" ? <p className="guard-attendance-dialog-error" role="alert">{process.error}</p> : null}
          <DialogFooter className="guard-attendance-dialog-footer">
            <button
              className="guard-attendance-dialog-confirm"
              disabled={isProcessing}
              type="button"
              onClick={handleProcessConfirm}
            >
              {isProcessing ? "처리중..." : "확인"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

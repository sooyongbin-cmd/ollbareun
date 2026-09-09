"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app-page";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  isDayOff?: boolean;
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
  const router = useRouter();
  const processingRef = useRef(false);
  const [process, setProcess] = useState<{
    action: "출근" | "퇴근";
    status: "processing" | "success" | "error";
    step: number;
    error: string;
  } | null>(null);
  const isProcessing = process?.status === "processing";
  const [error, setError] = useState("");
  const [guard, setGuard] = useState<GuardSession | null>(readStoredGuardSession);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const clockInDecision =
    guard?.isDayOff
      ? {
          allowed: false,
          reason: "오늘은 휴무일로 지정되어 출근할 수 없습니다.",
        }
      : guard?.worksite && latitude && longitude
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

  async function handleAttendance(action: "출근" | "퇴근") {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcess({ action, status: "processing", step: 0, error: "" });
    setError("");

    function advanceStep(step: number) {
      setProcess((current) => current ? { ...current, step } : current);
    }

    try {
      const activeGuard = readStoredGuardSession();
      if (!activeGuard?.employee || !activeGuard.worksite) {
        setGuard(activeGuard);
        throw new Error("로그인 정보 또는 배정된 근무지를 확인할 수 없습니다.");
      }

      advanceStep(1);
      const geolocation = navigator.geolocation;
      if (!geolocation) {
        throw new Error("이 브라우저에서는 위치 확인을 사용할 수 없습니다.");
      }
      let position: GeolocationPosition;
      try {
        position = await readCurrentPosition(geolocation);
      } catch {
        throw new Error("현재 위치를 확인하지 못했습니다. 위치 권한과 GPS 상태를 확인한 뒤 다시 시도해주세요.");
      }
      const nextLatitude = String(position.coords.latitude);
      const nextLongitude = String(position.coords.longitude);
      setLatitude(nextLatitude);
      setLongitude(nextLongitude);

      if (action === "퇴근") {
        const decision = canClockOutAtWorksite({
          attendance: asAttendance(activeGuard.attendance),
          worksite: asWorksite(activeGuard.worksite),
          currentLatitude: position.coords.latitude,
          currentLongitude: position.coords.longitude,
        });
        if (!decision.allowed) throw new Error(decision.reason);
      }

      advanceStep(2);
      const result = await postJson<{ attendance: AttendanceRow }>(
        action === "출근" ? "/api/attendance/clock-in" : "/api/attendance/clock-out",
        {
          employeeId: activeGuard.employee.id,
          ...(action === "출근" ? { worksiteId: activeGuard.worksite.id } : {}),
          latitude: nextLatitude,
          longitude: nextLongitude,
        },
      );

      advanceStep(3);
      const nextGuard = { ...activeGuard, attendance: result.attendance };
      setGuard(nextGuard);
      writeStoredGuardSession(nextGuard);
      setProcess({ action, status: "success", step: 4, error: "" });
    } catch (attendanceError) {
      const detail = attendanceError instanceof Error ? attendanceError.message : action + " 처리에 실패했습니다.";
      setProcess((current) => current ? { ...current, status: "error", error: detail } : current);
    } finally {
      processingRef.current = false;
    }
  }

  function handleProcessConfirm() {
    if (!process || process.status === "processing") return;
    if (process.status === "success") {
      router.push("/guard/main");
    } else {
      setProcess(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
      <PageHeader title="출퇴근" />
      <div>
        {guard ? (
          <section className="bg-muted/40 rounded-xl p-[1rem] border border-border/50">
            <div className="space-y-[2rem]">
              <AttendanceMapSection
                currentLatitude={latitude}
                currentLongitude={longitude}
                worksite={guard.worksite}
              />

              <div
                className={`p-4 rounded-xl text-center text-[0.9375rem] font-medium transition-colors ${
                  activeDecision.allowed ? "bg-primary/5 text-primary" : "bg-destructive text-foreground"
                }`}
                id="attendance-decision-section"
              >
                {activeDecision.reason}
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3" id="attendance-actions-section">
                <Button
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50"
                  data-testid="clock-in"
                  type="button"
                  disabled={isProcessing || !clockInDecision.allowed || !!guard.attendance?.clock_in_at}
                  onClick={() => void handleAttendance("출근")}
                >
                  출근
                </Button>
                <Button
                  data-testid="clock-out"
                  type="button"
                  disabled={isProcessing || !clockOutDecision.allowed}
                  onClick={() => void handleAttendance("퇴근")}
                  variant="outline"
                >
                  퇴근
                </Button>
              </div>

              {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">{error}</p> : null}
              <GuardLocationPermissionPrompt />
            </div>
          </section>
        ) : (
          <section
            className="bg-muted/40 rounded-xl p-[1rem] border border-border/50 text-center"
            id="attendance-auth-required-section"
          >
            <p className="text-[1.0625rem] text-muted-foreground">현장 근로자 인증 후 이용할 수 있습니다.</p>
            <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 mt-6 inline-flex" href="/guard">
              인증하러 가기
            </Link>
          </section>
        )}
      </div>
      <Dialog open={process !== null}>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{process?.action} 처리</DialogTitle>
            <DialogDescription aria-live="polite">
              {process?.status === "success"
                ? process.action + "처리 되었습니다."
                : process?.status === "error"
                  ? process.action + " 처리에 실패했습니다."
                  : (process?.action ?? "출퇴근") + " 처리중입니다..."}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm" aria-label="출퇴근 처리 과정" aria-live="polite">
            {["로그인 및 근무지 확인", "현재 위치 확인", (process?.action ?? "출퇴근") + " 기록 저장", "화면 정보 갱신"].map((label, index) => (
              <li key={label} className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <span className={process?.status === "error" && process.step === index ? "text-destructive" : "text-muted-foreground"}>
                  {process && index < process.step
                    ? "완료"
                    : process?.step === index
                      ? process.status === "error" ? "실패" : "진행중"
                      : "대기"}
                </span>
              </li>
            ))}
          </ol>
          {process?.status === "error" ? <p role="alert" className="text-sm text-destructive">{process.error}</p> : null}
          <DialogFooter>
            <Button type="button" className="w-full" disabled={isProcessing} onClick={handleProcessConfirm}>
              {isProcessing ? "처리중..." : "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

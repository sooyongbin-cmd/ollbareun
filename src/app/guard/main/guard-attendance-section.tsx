"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { distanceMeters, canClockIn, canClockOut, type AttendanceRecord, type Worksite } from "@/lib/phase1";
import type { GpsInfo } from "@/lib/gps";
import { GuardNoticeDialog } from "@/components/guard/guard-notice-dialog";
import { GuardActionButton } from "@/components/guard/guard-action-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  readStoredGuardSession,
  readStoredGuardSessionSnapshot,
  subscribeToGuardSessionChange,
  writeStoredGuardSession,
} from "../guard-session-storage";

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

function readGuardSessionSnapshot() {
  return readStoredGuardSessionSnapshot();
}

function subscribeToSessionChange(onStoreChange: () => void) {
  return subscribeToGuardSessionChange(onStoreChange);
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
  
  const [currentGps] = useState<GpsInfo | null>(null);
  const [locError] = useState("");
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
    const activeSession = readStoredGuardSession<GuardSession>({ touch: true });
    if (!activeSession?.employee || !activeSession.worksite || processing) return;

    const worksite: Worksite = {
      id: activeSession.worksite.id,
      name: activeSession.worksite.name,
      latitude: activeSession.worksite.gps_info.latitude,
      longitude: activeSession.worksite.gps_info.longitude,
      radiusMeters: activeSession.worksite.radius_meters,
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
        employeeId: activeSession.employee.id,
        worksiteId: activeSession.worksite.id,
        latitude: currentGps?.latitude,
        longitude: currentGps?.longitude,
      });
      
      const nextSession = { ...activeSession, attendance: result.attendance };
      writeStoredGuardSession(nextSession);
      setLocalAttendance(result.attendance);
      setAlertMessage({ title: "알림", message: "출근 처리되었습니다." });
    } catch (err) {
      setAlertMessage({ title: "오류", message: err instanceof Error ? err.message : "출근 처리 실패" });
    } finally {
      setProcessing(false);
    }
  }

  async function handleClockOut() {
    const activeSession = readStoredGuardSession<GuardSession>({ touch: true });
    if (!activeSession?.employee || !attendance || processing) return;

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
        employeeId: activeSession.employee.id,
        latitude: currentGps?.latitude ?? activeSession.worksite?.gps_info?.latitude,
        longitude: currentGps?.longitude ?? activeSession.worksite?.gps_info?.longitude,
      });
      
      const nextSession = { ...activeSession, attendance: result.attendance };
      writeStoredGuardSession(nextSession);
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
    <Card className="w-full shadow-sm border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Clock className="size-4 text-primary" />
          <span>출근 상황</span>
        </div>
        <CardTitle className="text-lg font-bold flex items-center justify-between mt-1">
          <span>오늘의 근태 기록</span>
          {isClockedOut ? (
            <Badge variant="outline" className="bg-muted text-muted-foreground">퇴근 완료</Badge>
          ) : isClockedIn ? (
            <Badge className="bg-emerald-600 text-white">근무 중</Badge>
          ) : (
            <Badge variant="secondary">출근 전</Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-3 text-center border">
          <div className="space-y-1 border-r border-border/40 pr-2">
            <p className="text-xs text-muted-foreground">출근 시각</p>
            <p className="text-lg font-bold text-foreground">{formatTime(attendance?.clock_in_at)}</p>
          </div>
          <div className="space-y-1 pl-2">
            <p className="text-xs text-muted-foreground">퇴근 시각</p>
            <p className="text-lg font-bold text-foreground">{formatTime(attendance?.clock_out_at)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs py-1 border-b border-border/40">
          <span className="text-muted-foreground font-medium">근무지와의 거리</span>
          <span className={`font-bold ${distance !== null && distance > (session?.worksite?.radius_meters ?? 100) ? "text-destructive" : "text-primary"}`}>
            {distance !== null ? `${Math.round(distance)}m` : locError || "출근 화면에서 확인"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <GuardActionButton
            onClick={handleClockIn}
            disabled={isClockedIn || processing}
            isLoading={processing && !isClockedIn}
            loadingText="처리 중..."
            variant={!isClockedIn ? "default" : "outline"}
          >
            출근하기
          </GuardActionButton>
          
          <GuardActionButton
            onClick={handleClockOut}
            disabled={!isClockedIn || isClockedOut || processing}
            isLoading={processing && isClockedIn && !isClockedOut}
            loadingText="처리 중..."
            variant={isClockedIn && !isClockedOut ? "default" : "outline"}
          >
            퇴근하기
          </GuardActionButton>
        </div>

        {isClockedOut && (
          <p className="text-xs text-muted-foreground font-medium text-center pt-1">
            오늘의 근무가 모두 완료되었습니다.
          </p>
        )}
      </CardContent>

      <GuardNoticeDialog
        open={Boolean(alertInfo)}
        onOpenChange={(open) => {
          if (!open) setAlertMessage(null);
        }}
        title={alertInfo?.title ?? "알림"}
        description={alertInfo?.message ?? ""}
        onConfirm={() => setAlertMessage(null)}
      />
    </Card>
  );
}

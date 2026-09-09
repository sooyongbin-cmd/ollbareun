"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";

import { getAttendanceStatus, formatAttendanceTime, formatWorkingTime, type AttendanceTimes } from "./attendance-status";

type GuardSession = {
  attendance?: AttendanceTimes | null;
  isDayOff?: boolean;
  worksite?: {
    id?: unknown;
    name?: unknown;
  } | null;
  assignment?: {
    start_date?: unknown;
    end_date?: unknown;
  } | null;
};

function readGuardSessionSnapshot() {
  return readStoredGuardSessionSnapshot();
}

function subscribeToSessionChange(onStoreChange: () => void) {
  return subscribeToGuardSessionChange(onStoreChange);
}

export default function GuardWorksiteSection() {
  const [siteResult, setSiteResult] = useState<{
    worksiteId: string;
    sites: Array<{ id: string; name: string }>;
    error: boolean;
  } | null>(null);
  const storedSession = useSyncExternalStore(
    subscribeToSessionChange,
    readGuardSessionSnapshot,
    () => null,
  );

  const sessionData = useMemo(() => {
    if (!storedSession) return null;
    try {
      const session = JSON.parse(storedSession) as GuardSession;
      const worksiteName = typeof session.worksite?.name === "string" ? session.worksite.name : null;
      const worksiteId = typeof session.worksite?.id === "string" ? session.worksite.id : null;
      const startDate = typeof session.assignment?.start_date === "string" ? session.assignment.start_date : null;
      const endDate = typeof session.assignment?.end_date === "string" ? session.assignment.end_date : null;
      
      return { attendance: session.attendance, worksiteId, worksiteName, startDate, endDate, isDayOff: session.isDayOff === true };
    } catch {
      return null;
    }
  }, [storedSession]);

  const worksiteId = sessionData?.worksiteId;

  useEffect(() => {
    if (!worksiteId) return;
    const controller = new AbortController();

    async function loadSites() {
      try {
        const response = await fetch("/api/inspection/sites", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("현장 목록 조회 실패");
        const payload = await response.json() as {
          sites: Array<{ id: string; name: string; worksite_id: string }>;
        };
        const sites = payload.sites.filter((site) => site.worksite_id === worksiteId);
        if (!controller.signal.aborted) {
          setSiteResult({ worksiteId: worksiteId!, sites, error: false });
        }
      } catch {
        if (!controller.signal.aborted) {
          setSiteResult({ worksiteId: worksiteId!, sites: [], error: true });
        }
      }
    }

    void loadSites();
    return () => controller.abort();
  }, [worksiteId]);

  const currentSites = siteResult?.worksiteId === worksiteId ? siteResult : null;

  const attendance = sessionData?.attendance;
  const attendanceStatus = getAttendanceStatus(attendance);

  if (!sessionData?.worksiteName) {
    return (
      <section className="mb-6 bg-background rounded-xl p-6 border border-border shadow-sm">
        <p className="text-[1.0625rem] font-semibold text-muted-foreground text-center py-2">
          배정된 근무지 정보가 없습니다
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6 bg-background rounded-xl p-6 border border-border shadow-sm space-y-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[0.875rem] font-semibold text-muted-foreground">오늘의 근무지 :</h3>
        <p className="text-[1.3125rem] font-bold text-primary">
          {sessionData.worksiteName}
        </p>
      </div>
      {sessionData.isDayOff ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm font-semibold text-primary">
          오늘은 지정된 휴무일입니다.
        </p>
      ) : null}
      {sessionData.startDate && (
        <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground border-t border-border/30 pt-2">
          <span className="font-semibold w-[5rem]">배정기간 :</span>
          <span className="font-medium">
            {sessionData.startDate === sessionData.endDate 
              ? sessionData.startDate 
              : `${sessionData.startDate} ~ ${sessionData.endDate}`}
          </span>
        </div>
      )}
      {worksiteId && (
        <div className="flex items-start gap-2 text-[0.8125rem] text-muted-foreground border-t border-border/30 pt-2">
          <span className="font-semibold w-[5rem] shrink-0">현장이름 :</span>
          {!currentSites ? (
            <p role="status">현장 목록을 불러오는 중입니다.</p>
          ) : currentSites.error ? (
            <p role="alert">현장 목록을 불러오지 못했습니다.</p>
          ) : currentSites.sites.length === 0 ? (
            <p>등록된 현장이 없습니다.</p>
          ) : (
            <ul className="min-w-0 space-y-1 font-medium text-foreground">
              {currentSites.sites.map((site) => (
                <li key={site.id} className="break-words">{site.name}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {attendanceStatus.showTimes && attendance?.clock_in_at && (
        <dl className="space-y-2 border-t border-border/30 pt-2 text-[0.8125rem]">
          <div className="flex gap-2">
            <dt className="w-[5rem] shrink-0 font-semibold text-muted-foreground">출근시각 :</dt>
            <dd>{formatAttendanceTime(attendance.clock_in_at)}</dd>
          </div>
          {attendance.clock_out_at && (
            <>
              <div className="flex gap-2">
                <dt className="w-[5rem] shrink-0 font-semibold text-muted-foreground">퇴근시각 :</dt>
                <dd>{formatAttendanceTime(attendance.clock_out_at)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[5rem] shrink-0 font-semibold text-muted-foreground">근무시간 :</dt>
                <dd>{formatWorkingTime(attendance.clock_in_at, attendance.clock_out_at)}</dd>
              </div>
            </>
          )}
        </dl>
      )}
    </section>
  );
}

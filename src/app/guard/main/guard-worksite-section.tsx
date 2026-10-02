"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";

import type { AttendanceTimes } from "./attendance-status";
import GuardLocationGateLink from "./guard-location-gate-link";
import {
  formatGuardWorkDate,
  formatGuardWorkTime,
  getGuardWorkAction,
  isTodayGuardWorkDate,
  selectGuardWorkSchedule,
  type GuardWorkSchedule,
} from "@/lib/guard-work-schedule";

type GuardSession = {
  attendance?: AttendanceTimes | null;
  isDayOff?: boolean;
  employee?: {
    id?: unknown;
  } | null;
  worksite?: {
    id?: unknown;
    name?: unknown;
  } | null;
  assignment?: {
    id?: unknown;
    in_time?: unknown;
    out_time?: unknown;
  } | null;
  scheduledAttendances?: GuardWorkSchedule[] | null;
};

function readGuardSessionSnapshot() {
  return readStoredGuardSessionSnapshot();
}

function subscribeToSessionChange(onStoreChange: () => void) {
  return subscribeToGuardSessionChange(onStoreChange);
}

export default function GuardWorksiteSection() {
  const storedSession = useSyncExternalStore(
    subscribeToSessionChange,
    readGuardSessionSnapshot,
    () => null,
  );
  const session = useMemo(() => {
    if (!storedSession) return null;
    try {
      return JSON.parse(storedSession) as GuardSession;
    } catch {
      return null;
    }
  }, [storedSession]);

  const selectedShift = selectGuardWorkSchedule(session?.scheduledAttendances ?? []);
  const workAction = getGuardWorkAction(selectedShift);
  const hasAssignedWorksite = Boolean(session?.worksite?.id && session?.worksite?.name);
  const worksiteName = typeof session?.worksite?.name === "string" ? session.worksite.name : null;
  const scheduledStart = formatGuardWorkTime(selectedShift?.intime ?? null);
  const scheduledEnd = formatGuardWorkTime(selectedShift?.outtime ?? null);
  const timeLabel = scheduledStart && scheduledEnd ? `${scheduledStart} - ${scheduledEnd}` : "근무시간 미등록";
  const statusLabel = workAction === "clock-out"
    ? "퇴근가능"
    : workAction === "complete"
      ? "근무완료"
      : "출근가능";
  const buttonLabel = workAction === "clock-out"
    ? "퇴근하기"
    : workAction === "complete"
      ? "금일 근무 완료"
      : "출근하기";

  return (
    <section className="guard-work-card">
      <div className="guard-work-card-content">
        <div className="guard-work-heading">
          <h1 className="guard-title-text">오늘 근무</h1>
          <p className="guard-blue-emphasis-text">{worksiteName || "근무지 미배정"}</p>
        </div>

        <div className="guard-schedule-row">
          <div className="guard-schedule-details">
            <p className="guard-date-emphasis-text">
              {selectedShift ? (
                <>
                  {formatGuardWorkDate(selectedShift.work_date)}
                  {!isTodayGuardWorkDate(selectedShift.work_date) ? " 전일출근" : ""}
                </>
              ) : "오늘 근무가 없습니다."}
            </p>
            {selectedShift ? (
              <div className="guard-schedule-time-row">
                <p className="guard-body-text">{timeLabel}</p>
                <span className="guard-attendance-status" role="status">{statusLabel}</span>
              </div>
            ) : null}
          </div>
        </div>

        <GuardLocationGateLink
          buttonClassName="guard-general-button"
          href="/guard/main/attendance"
          hasAssignedWorksite={hasAssignedWorksite}
          disabled={!selectedShift || workAction === "complete"}
          variant="default"
        >
          {buttonLabel}
        </GuardLocationGateLink>
      </div>
    </section>
  );
}

"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";
import { getGuardWorkAction, selectGuardWorkSchedule, type GuardWorkSchedule } from "@/lib/guard-work-schedule";

type GuardSessionSnapshot = {
  attendance?: { work_date?: string | null; work_intime?: string | null; work_outtime?: string | null } | null;
  scheduledAttendances?: GuardWorkSchedule[] | null;
};

export function useGuardScheduleAvailability() {
  const snapshot = useSyncExternalStore(
    subscribeToGuardSessionChange,
    readStoredGuardSessionSnapshot,
    () => null,
  );
  const session = useMemo(() => {
    if (!snapshot) return null;
    try {
      return JSON.parse(snapshot) as GuardSessionSnapshot;
    } catch {
      return null;
    }
  }, [snapshot]);
  const schedules = session?.scheduledAttendances ?? [];
  const selectedSchedule = selectGuardWorkSchedule(schedules);
  const action = getGuardWorkAction(selectedSchedule);
  const isLeave = selectedSchedule?.intime_status === "3";

  const attendance = selectedSchedule ?? session?.attendance;
  const canAccessSafetyEducation = !isLeave && Boolean(attendance?.work_intime && !attendance.work_outtime);
  const selectedWorkDate = attendance?.work_date
    ?? session?.attendance?.work_date
    ?? new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  return {
    canAccessSafetyEducation,
    canAccessWorkReports: Boolean(selectedSchedule?.work_intime && !selectedSchedule.work_outtime && !isLeave),
    selectedWorkDate,
    hasWorkSchedule: selectedSchedule !== null && !isLeave,
    canAccessAttendance: !isLeave && (action === "clock-in" || action === "clock-out"),
  };
}

"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";
import { getGuardWorkAction, selectGuardWorkSchedule, type GuardWorkSchedule } from "@/lib/guard-work-schedule";

type GuardSessionSnapshot = {
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

  return {
    hasWorkSchedule: schedules.length > 0,
    canAccessAttendance: action === "clock-in" || action === "clock-out",
  };
}

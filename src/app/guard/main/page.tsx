"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import GuardWorksiteSection from "./guard-worksite-section";
import GuardPatrolLink from "./guard-patrol-link";
import { useGuardScheduleAvailability } from "./use-guard-schedule-availability";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";
import { selectGuardWorkSchedule, type GuardWorkSchedule } from "@/lib/guard-work-schedule";

type GuardSession = {
  attendance?: { work_date?: string | null; work_intime?: string | null; work_outtime?: string | null } | null;
  scheduledAttendances?: GuardWorkSchedule[] | null;
};

function currentKstDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function GuardMainPage() {
  const { hasWorkSchedule } = useGuardScheduleAvailability();
  const storedSession = useSyncExternalStore(
    subscribeToGuardSessionChange,
    readStoredGuardSessionSnapshot,
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
  const selectedSchedule = selectGuardWorkSchedule(session?.scheduledAttendances ?? []);
  const isClockedIn = selectedSchedule
    ? Boolean(selectedSchedule.work_intime && !selectedSchedule.work_outtime)
    : Boolean(session?.attendance?.work_intime && !session.attendance.work_outtime);
  const selectedWorkDate = selectedSchedule?.work_date
    ?? session?.attendance?.work_date
    ?? currentKstDate();

  return (
    <div className="guard-main-page">
      <GuardWorksiteSection />

      <section aria-label="근무자 바로가기" className="guard-main-menu">
        {isClockedIn ? <Link className="guard-menu-button" href={`/guard/main/safety?workDate=${encodeURIComponent(selectedWorkDate)}`}>
          안전교육
        </Link> : <button aria-disabled="true" className="guard-menu-button" disabled type="button">안전교육</button>}
        <GuardPatrolLink />
        {hasWorkSchedule ? (
          <Link className="guard-menu-button" href="/guard/main/special-remarks">
            특이사항 보고
          </Link>
        ) : (
          <button aria-disabled="true" className="guard-menu-button" disabled type="button">
            특이사항 보고
          </button>
        )}
        <Link className="guard-menu-button" href="/guard/main/profile">
          근무 정보
        </Link>
      </section>
    </div>
  );
}

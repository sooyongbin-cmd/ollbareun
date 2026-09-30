"use client";

import Link from "next/link";
import { useGuardPatrolVisibility } from "./use-guard-patrol-visibility";
import { useGuardScheduleAvailability } from "./use-guard-schedule-availability";

export default function GuardPatrolLink() {
  const visible = useGuardPatrolVisibility();
  const { hasWorkSchedule } = useGuardScheduleAvailability();

  return visible && hasWorkSchedule ? (
    <Link className="guard-menu-button" href="/guard/main/work">
      순찰
    </Link>
  ) : (
    <button aria-disabled="true" className="guard-menu-button" disabled type="button">
      순찰
    </button>
  );
}

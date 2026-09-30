"use client";

import Link from "next/link";

import GuardWorksiteSection from "./guard-worksite-section";
import GuardPatrolLink from "./guard-patrol-link";
import { useGuardScheduleAvailability } from "./use-guard-schedule-availability";

export default function GuardMainPage() {
  const { hasWorkSchedule } = useGuardScheduleAvailability();

  return (
    <div className="guard-main-page">
      <GuardWorksiteSection />

      <section aria-label="근무자 바로가기" className="guard-main-menu">
        <Link className="guard-menu-button" href="/guard/main/safety">
          안전교육
        </Link>
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
        <Link className="guard-menu-button" href="/guard/main/leave">
          휴가 신청
        </Link>
      </section>
    </div>
  );
}

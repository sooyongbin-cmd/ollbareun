"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import GuardLocationGateLink from "./guard-location-gate-link";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";
import GuardWorksiteSection from "./guard-worksite-section";

type GuardSession = {
  assignment?: {
    id?: unknown;
  } | null;
  worksite?: {
    id?: unknown;
    name?: unknown;
  } | null;
};

function readGuardSessionSnapshot() {
  return readStoredGuardSessionSnapshot();
}

export default function GuardMainPage() {
  const storedSession = useSyncExternalStore(
    subscribeToGuardSessionChange,
    readGuardSessionSnapshot,
    () => null,
  );

  const hasAssignedWorksite = useMemo(() => {
    if (!storedSession) return false;
    try {
      const session = JSON.parse(storedSession) as GuardSession;
      return (
        typeof session.assignment?.id === "string" &&
        session.assignment.id.trim() !== "" &&
        typeof session.worksite?.id === "string" &&
        session.worksite.id.trim() !== "" &&
        typeof session.worksite?.name === "string" &&
        session.worksite.name.trim() !== ""
      );
    } catch {
      return false;
    }
  }, [storedSession]);

  return (
    <div className="guard-main-page">
      <GuardWorksiteSection />

      <section aria-label="근무자 바로가기" className="guard-main-menu">
        <Link className="guard-menu-button" href="/guard/main/safety">
          안전교육
        </Link>
        <GuardLocationGateLink
          buttonClassName="guard-menu-button"
          href="/guard/main/work"
          hasAssignedWorksite={hasAssignedWorksite}
          variant="outline"
        >
          순찰
        </GuardLocationGateLink>
        <GuardLocationGateLink
          buttonClassName="guard-menu-button"
          href="/guard/main/special-remarks"
          hasAssignedWorksite={hasAssignedWorksite}
          variant="outline"
        >
          특이사항 보고
        </GuardLocationGateLink>
        <Link className="guard-menu-button" href="/guard/main/profile">
          근무 정보
        </Link>
      </section>
    </div>
  );
}

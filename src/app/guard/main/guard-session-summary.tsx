"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";

type GuardSession = {
  employee?: {
    name?: unknown;
  };
  worksite?: {
    name?: unknown;
  } | null;
};

function readGuardSessionSnapshot() {
  return readStoredGuardSessionSnapshot();
}

function parseGuardSummary(storedSession: string | null) {
  if (!storedSession) {
    return null;
  }

  try {
    const session = JSON.parse(storedSession) as GuardSession;
    const name = typeof session.employee?.name === "string" ? session.employee.name : "";
    const worksiteName = typeof session.worksite?.name === "string" ? session.worksite.name : "";

    return name ? { name, worksiteName } : null;
  } catch {
    return null;
  }
}

export default function GuardSessionSummary() {
  const storedSession = useSyncExternalStore(
    subscribeToGuardSessionChange,
    readGuardSessionSnapshot,
    () => null,
  );
  const summary = useMemo(() => parseGuardSummary(storedSession), [storedSession]);

  if (!summary) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-2 text-[12px] text-ink-muted-48 sm:text-[13px]">
      <span className="truncate font-medium text-ink" title={summary.name}>
        {summary.name}
      </span>
      {summary.worksiteName ? (
        <span className="min-w-0 truncate" title={`오늘의 근무지 : ${summary.worksiteName}`}>
          (오늘의 근무지 : {summary.worksiteName})
        </span>
      ) : null}
    </div>
  );
}

"use client";

import { useMemo, useSyncExternalStore } from "react";

type GuardSession = {
  employee?: {
    name?: unknown;
    phone?: unknown;
  };
  worksite?: {
    name?: unknown;
  } | null;
};

const guardSessionStorageKey = "ollbareun.guard.session";

function readGuardSessionSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(guardSessionStorageKey);
  } catch {
    return null;
  }
}

function parseGuardSummary(storedSession: string | null) {
  if (!storedSession) {
    return null;
  }

  try {
    const session = JSON.parse(storedSession) as GuardSession;
    const name = typeof session.employee?.name === "string" ? session.employee.name : "";
    const phone = typeof session.employee?.phone === "string" ? session.employee.phone : "";
    const worksiteName = typeof session.worksite?.name === "string" ? session.worksite.name : "";

    return name && phone ? { name, phone, worksiteName } : null;
  } catch {
    return null;
  }
}

export default function GuardSessionSummary() {
  const storedSession = useSyncExternalStore(
    () => () => undefined,
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
      <span aria-hidden="true" className="h-3 w-px bg-hairline" />
      <span className="whitespace-nowrap" title={summary.phone}>
        {summary.phone}
      </span>
      {summary.worksiteName ? (
        <span className="min-w-0 truncate" title={`오늘의 근무지 : ${summary.worksiteName}`}>
          (오늘의 근무지 : {summary.worksiteName})
        </span>
      ) : null}
    </div>
  );
}

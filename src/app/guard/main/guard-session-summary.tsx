"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";

type GuardSession = {
  employee?: {
    name?: unknown;
    role?: unknown;
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
    const role = typeof session.employee?.role === "string" ? session.employee.role : "";
    const worksiteName = typeof session.worksite?.name === "string" ? session.worksite.name : "";

    return name ? { name, role, worksiteName } : null;
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

  const name = summary?.name || "근무자";
  const role = summary?.role || "경비원";

  return (
    <div className="guard-user-badge" title={`${name}(${role})`}>
      <span className="truncate">{name}({role})</span>
    </div>
  );
}

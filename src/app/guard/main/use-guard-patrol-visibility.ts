"use client";

import { useSyncExternalStore } from "react";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";

function getServerSnapshot() {
  return null;
}

// Presentation only; this is not a substitute for server-side authorization.
export function useGuardPatrolVisibility() {
  const snapshot = useSyncExternalStore(
    subscribeToGuardSessionChange,
    readStoredGuardSessionSnapshot,
    getServerSnapshot,
  );
  try {
    const role: unknown = snapshot ? JSON.parse(snapshot)?.employee?.role : null;
    return role === "경비원" || role === "미화원";
  } catch {
    return false;
  }
}

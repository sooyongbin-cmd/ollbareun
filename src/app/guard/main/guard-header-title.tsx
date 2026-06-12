"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";

type GuardSession = {
  employee?: {
    role?: string;
  } | null;
};

function readGuardSessionSnapshot() {
  return readStoredGuardSessionSnapshot();
}

function subscribeToSessionChange(onStoreChange: () => void) {
  return subscribeToGuardSessionChange(onStoreChange);
}

export default function GuardHeaderTitle() {
  const storedSession = useSyncExternalStore(
    subscribeToSessionChange,
    readGuardSessionSnapshot,
    () => null,
  );

  const role = useMemo(() => {
    if (!storedSession) return "경비원";
    try {
      const session = JSON.parse(storedSession) as GuardSession;
      return session.employee?.role || "경비원";
    } catch {
      return "경비원";
    }
  }, [storedSession]);

  return <span>{role}</span>;
}

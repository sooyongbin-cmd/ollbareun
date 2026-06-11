"use client";

import { useMemo, useSyncExternalStore } from "react";

type GuardSession = {
  employee?: {
    role?: string;
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

function subscribeToSessionChange(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  void onStoreChange;
  return () => {};
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

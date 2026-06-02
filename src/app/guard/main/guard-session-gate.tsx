"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const guardSessionStorageKey = "ollbareun.guard.session";

function hasActiveGuardSession() {
  try {
    const stored = window.sessionStorage.getItem(guardSessionStorageKey);
    if (!stored) return false;

    const session = JSON.parse(stored);
    return typeof session.employee?.id === "string" && session.employee.id.trim() !== "";
  } catch {
    return false;
  }
}

export default function GuardSessionGate() {
  const router = useRouter();

  useEffect(() => {
    if (!hasActiveGuardSession()) {
      router.replace("/guard");
    }
  }, [router]);

  return null;
}

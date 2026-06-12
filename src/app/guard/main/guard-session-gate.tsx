"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasActiveStoredGuardSession } from "../guard-session-storage";

function hasActiveGuardSession() {
  return hasActiveStoredGuardSession({ touch: true });
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

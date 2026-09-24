"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  clearStoredGuardSession,
  readStoredGuardSession,
  writeStoredGuardSession,
} from "../guard-session-storage";

export default function GuardSessionGate() {
  const router = useRouter();

  useEffect(() => {
    const storedSession = readStoredGuardSession<{
      employee: { id: string };
      sessionLogId?: string;
    }>({ touch: true });

    if (!storedSession) {
      router.replace("/guard");
      return;
    }

    const durableSession = storedSession;
    let active = true;

    async function validateStoredSession() {
      try {
        const response = await fetch("/api/guard/session");

        if (response.status === 401 || response.status === 403 || response.status === 404) {
          clearStoredGuardSession();
          router.replace("/guard");
          return;
        }

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          session?: Record<string, unknown>;
        };
        if (active && payload.session) {
          writeStoredGuardSession({
            ...durableSession,
            ...payload.session,
            sessionLogId: durableSession.sessionLogId,
          });
        }
      } catch {
        // Preserve the durable session during temporary network failures.
      }
    }

    void validateStoredSession();

    return () => {
      active = false;
    };
  }, [router]);

  return null;
}

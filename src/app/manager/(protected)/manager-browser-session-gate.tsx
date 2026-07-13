"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { hasActiveManagerBrowserSession, hasPersistedSupabaseAuthCookie } from "../manager-browser-session-storage";

export default function ManagerBrowserSessionGate() {
  useEffect(() => {
    if (hasActiveManagerBrowserSession() || !hasPersistedSupabaseAuthCookie()) {
      return;
    }

    let isMounted = true;

    async function endPersistedSession() {
      try {
        await createSupabaseBrowserClient().auth.signOut();
      } finally {
        if (isMounted) {
          window.location.assign("/manager/auth");
        }
      }
    }

    void endPersistedSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}

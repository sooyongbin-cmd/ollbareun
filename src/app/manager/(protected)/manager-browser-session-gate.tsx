"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { TEMPORARY_MANAGER_AUTH_BYPASS } from "@/lib/manager-auth-bypass";
import { hasActiveManagerBrowserSession, hasPersistedSupabaseAuthCookie } from "../manager-browser-session-storage";

export default function ManagerBrowserSessionGate() {
  useEffect(() => {
    // TEMPORARY: 관리자 테스트 중에는 브라우저 세션 검사와 로그인 페이지 이동을 건너뜁니다.
    if (TEMPORARY_MANAGER_AUTH_BYPASS) {
      return;
    }

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

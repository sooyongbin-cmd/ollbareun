"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import GuardWorksiteSection from "./guard-worksite-section";
import GuardAttendanceSection from "./guard-attendance-section";
import GuardSafetySection from "./guard-safety-section";
import GuardPushRegister from "./guard-push-register";
import GuardLocationGateLink from "./guard-location-gate-link";

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

export default function GuardMainPage() {
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

  const inspectionLabel = useMemo(() => {
    if (role === "경비원") return "순찰";
    if (role === "미화원") return "청소구역";
    return null;
  }, [role]);

  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[80px]">
      <div className="max-w-[600px] mx-auto">
        <GuardWorksiteSection />
        
        <section className="bg-canvas-parchment rounded-[18px] p-[16px] border border-hairline/50">
          <div className="flex flex-col gap-3">
            <GuardLocationGateLink href="/guard/main/attendance">출근하기</GuardLocationGateLink>
            {inspectionLabel !== null && (
              <GuardLocationGateLink href="/guard/main/inspection">
                {inspectionLabel}
              </GuardLocationGateLink>
            )}
            <GuardLocationGateLink href="/guard/main/special-remarks">특이사항</GuardLocationGateLink>
            <Link className="button-secondary w-full justify-center" href="/guard/main/profile">
              개인프로필
            </Link>
          </div>
        </section>
        <GuardSafetySection />
        <GuardAttendanceSection />
        <GuardPushRegister />
      </div>
    </div>
  );
}

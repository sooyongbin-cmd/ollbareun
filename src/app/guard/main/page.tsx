"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import GuardWorksiteSection from "./guard-worksite-section";
import GuardAttendanceSection from "./guard-attendance-section";
import GuardSafetySection from "./guard-safety-section";
import GuardPushRegister from "./guard-push-register";
import GuardLocationGateLink from "./guard-location-gate-link";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";

type GuardSession = {
  employee?: {
    role?: string;
  } | null;
  assignment?: {
    id?: unknown;
  } | null;
  worksite?: {
    id?: unknown;
    name?: unknown;
  } | null;
};

function readGuardSessionSnapshot() {
  return readStoredGuardSessionSnapshot();
}

function subscribeToSessionChange(onStoreChange: () => void) {
  return subscribeToGuardSessionChange(onStoreChange);
}

export default function GuardMainPage() {
  const [useQrCode, setUseQrCode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/system/configs/USE_QR_CODE")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.config?.content?.trim() === "Y") {
          setUseQrCode(true);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

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

  const inspectionBaseLabel = useMemo(() => {
    if (role === "경비원") return "순찰";
    if (role === "미화원") return "청소구역";
    return null;
  }, [role]);

  const hasAssignedWorksite = useMemo(() => {
    if (!storedSession) return false;
    try {
      const session = JSON.parse(storedSession) as GuardSession;
      return (
        typeof session.assignment?.id === "string" &&
        session.assignment.id.trim() !== "" &&
        typeof session.worksite?.id === "string" &&
        session.worksite.id.trim() !== "" &&
        typeof session.worksite?.name === "string" &&
        session.worksite.name.trim() !== ""
      );
    } catch {
      return false;
    }
  }, [storedSession]);

  return (
    <div className="mx-auto max-w-[61.25rem] w-full px-5 py-[5rem]">
      <div className="max-w-[37.5rem] mx-auto">
        <GuardWorksiteSection />
        
        <section className="bg-muted/40 rounded-xl p-[1rem] border border-border/50">
          <div className="flex flex-col gap-3">
            <GuardLocationGateLink href="/guard/main/attendance" hasAssignedWorksite={hasAssignedWorksite}>
              출근하기
            </GuardLocationGateLink>
            {inspectionBaseLabel !== null && (
              <>
                {useQrCode && (
                  <GuardLocationGateLink href="/guard/main/inspection" hasAssignedWorksite={hasAssignedWorksite}>
                    {inspectionBaseLabel}(QR코드)
                  </GuardLocationGateLink>
                )}
                <GuardLocationGateLink href="/guard/main/inspection-nfc" hasAssignedWorksite={hasAssignedWorksite}>
                  {inspectionBaseLabel}(NFC태그)
                </GuardLocationGateLink>
              </>
            )}
            <GuardLocationGateLink href="/guard/main/special-remarks" hasAssignedWorksite={hasAssignedWorksite}>
              특이사항
            </GuardLocationGateLink>
            <Button asChild className="w-full" variant="outline">
              <Link href="/guard/main/profile">개인프로필</Link>
            </Button>
          </div>
        </section>
        <GuardSafetySection />
        <GuardAttendanceSection />
        <GuardPushRegister />
      </div>
    </div>
  );
}

"use client";

import { QrCode, Radio, TriangleAlert } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

import { PageHeader, SectionCard } from "@/components/app-page";
import { Badge } from "@/components/ui/badge";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../../guard-session-storage";
import GuardLocationGateLink from "../guard-location-gate-link";

type GuardSession = {
  employee?: { role?: string } | null;
  assignment?: { id?: unknown } | null;
  worksite?: { id?: unknown; name?: unknown } | null;
};

export default function GuardWorkPage() {
  const storedSession = useSyncExternalStore(
    subscribeToGuardSessionChange,
    readStoredGuardSessionSnapshot,
    () => null,
  );
  const session = useMemo(() => {
    try {
      return storedSession ? (JSON.parse(storedSession) as GuardSession) : null;
    } catch {
      return null;
    }
  }, [storedSession]);
  const role = session?.employee?.role || "현장 근로자";
  const workLabel = role === "미화원" ? "청소구역" : "순찰";
  const supportsInspection = role === "경비원" || role === "미화원";
  const hasAssignedWorksite =
    typeof session?.assignment?.id === "string" &&
    Boolean(session.assignment.id.trim()) &&
    typeof session?.worksite?.id === "string" &&
    Boolean(session.worksite.id.trim()) &&
    typeof session?.worksite?.name === "string" &&
    Boolean(session.worksite.name.trim());

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
      <PageHeader
        actions={<Badge variant="secondary">{role}</Badge>}
        description="근무지에 도착한 뒤 필요한 현장 업무를 선택하세요."
        title="업무"
      />
      <SectionCard contentClassName="grid gap-3" title="현장 작업">
        {supportsInspection ? (
          <>
            <GuardLocationGateLink href="/guard/main/inspection" hasAssignedWorksite={hasAssignedWorksite}>
              <QrCode aria-hidden="true" className="size-5" />
              {workLabel} QR 스캔
            </GuardLocationGateLink>
            <GuardLocationGateLink href="/guard/main/inspection-nfc" hasAssignedWorksite={hasAssignedWorksite}>
              <Radio aria-hidden="true" className="size-5" />
              {workLabel} NFC 태그
            </GuardLocationGateLink>
          </>
        ) : null}
        <GuardLocationGateLink href="/guard/main/special-remarks" hasAssignedWorksite={hasAssignedWorksite}>
          <TriangleAlert aria-hidden="true" className="size-5" />
          특이사항 보고
        </GuardLocationGateLink>
      </SectionCard>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import LoadingBoard from "@/components/loading-board";
import Link from "next/link";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";

type EducationResourceRow = {
  id: string;
};

type EducationCompletionRow = {
  employee_id: string;
  resource_id: string;
  is_completed: boolean;
};

type GuardSession = {
  employee?: {
    id?: unknown;
  };
};

function readGuardSessionSnapshot() {
  return readStoredGuardSessionSnapshot();
}

function subscribeToSessionChange(onStoreChange: () => void) {
  return subscribeToGuardSessionChange(onStoreChange);
}

export default function GuardSafetySection() {
  const storedSession = useSyncExternalStore(
    subscribeToSessionChange,
    readGuardSessionSnapshot,
    () => null,
  );

  const [resources, setResources] = useState<EducationResourceRow[]>([]);
  const [completions, setCompletions] = useState<EducationCompletionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const employeeId = useMemo(() => {
    if (!storedSession) return null;
    try {
      const session = JSON.parse(storedSession) as GuardSession;
      return typeof session.employee?.id === "string" ? session.employee.id : null;
    } catch {
      return null;
    }
  }, [storedSession]);

  useEffect(() => {
    let ignore = false;
    async function loadEduData() {
      if (!employeeId) return;
      try {
        const [resResponse, compResponse] = await Promise.all([
          fetch("/api/education/resources"),
          fetch("/api/education/completions"),
        ]);
        if (!resResponse.ok || !compResponse.ok) return;

        const resPayload = await resResponse.json();
        const compPayload = await compResponse.json();

        if (!ignore) {
          setResources(resPayload.resources ?? []);
          setCompletions(compPayload.completions ?? []);
          setLoading(false);
        }
      } catch {
        // Silent fail
      }
    }
    void loadEduData();
    return () => { ignore = true; };
  }, [employeeId]);

  const eduStatus = useMemo(() => {
    if (!employeeId || resources.length === 0) return null;
    const completedCount = completions.filter(
      (c) => c.employee_id === employeeId && c.is_completed
    ).length;
    return { completed: completedCount, total: resources.length };
  }, [completions, resources, employeeId]);

  return (
    <section className="mb-6 bg-background rounded-xl p-6 border border-border shadow-sm space-y-4">
      <h3 className="text-[14px] font-semibold text-muted-foreground">안전교육 상황</h3>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15px] text-foreground/80">
          <span className="font-semibold text-muted-foreground">이수 현황 :</span>
          {loading ? (
            <LoadingBoard className="min-h-6 min-w-12" label="안전교육 이수 현황을 불러오는 중입니다." />
          ) : (
            <span className="font-bold text-[20px] text-foreground">
              {eduStatus ? `${eduStatus.completed} / ${eduStatus.total}` : "정보 없음"}
            </span>
          )}
        </div>
        <Link 
          href="/guard/main/safety" 
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 text-[13px] py-2 px-4"
        >
          교육 받기
        </Link>
      </div>
      
      {eduStatus && eduStatus.completed < eduStatus.total && (
        <p className="text-[13px] text-destructive font-medium pt-2 border-t border-border/30">
          미이수 교육이 {eduStatus.total - eduStatus.completed}건 있습니다. 교육을 완료해주세요.
        </p>
      )}
      
      {eduStatus && eduStatus.completed === eduStatus.total && eduStatus.total > 0 && (
        <p className="text-[13px] text-primary font-medium pt-2 border-t border-border/30">
          모든 안전교육을 이수하였습니다.
        </p>
      )}
    </section>
  );
}

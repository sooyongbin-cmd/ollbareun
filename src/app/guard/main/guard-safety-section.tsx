"use client";

import { useEducationRefresh } from "@/lib/use-education-refresh";
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
  const refreshVersion = useEducationRefresh();
  const storedSession = useSyncExternalStore(
    subscribeToSessionChange,
    readGuardSessionSnapshot,
    () => null,
  );

  const [resources, setResources] = useState<EducationResourceRow[]>([]);
  const [completions, setCompletions] = useState<EducationCompletionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      if (!employeeId) { setLoading(false); return; }
      try {
        const [resResponse, compResponse] = await Promise.all([
          fetch("/api/education/resources"),
          fetch("/api/education/completions?view=current"),
        ]);
        if (!resResponse.ok || !compResponse.ok) throw new Error("안전교육 현황을 불러오지 못했습니다.");

        const resPayload = await resResponse.json();
        const compPayload = await compResponse.json();

        if (!ignore) {
          setResources(resPayload.resources ?? []);
          setCompletions(compPayload.completions ?? []);
          setError("");
        }
      } catch {
        if (!ignore) setError("안전교육 현황을 불러오지 못했습니다. 교육 받기에서 다시 확인해 주세요.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadEduData();
    return () => { ignore = true; };
  }, [employeeId, refreshVersion, storedSession]);

  const eduStatus = useMemo(() => {
    if (!employeeId || resources.length === 0) return null;
    const completedCount = completions.filter(
      (c) => c.employee_id === employeeId && c.is_completed
    ).length;
    return { completed: completedCount, total: resources.length };
  }, [completions, resources, employeeId]);

  return (
    <section className="mb-6 bg-background rounded-xl p-6 border border-border shadow-sm space-y-4">
      <h3 className="text-[0.875rem] font-semibold text-muted-foreground">안전교육 상황</h3>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[0.9375rem] text-foreground/80">
          <span className="font-semibold text-muted-foreground">이수 현황 :</span>
          {loading ? (
            <LoadingBoard className="min-h-6 min-w-12" label="안전교육 이수 현황을 불러오는 중입니다." />
          ) : (
            <span className="font-bold text-[1.25rem] text-foreground">
              {error ? "확인 필요" : eduStatus ? `${eduStatus.completed} / ${eduStatus.total}` : "교육자료 없음"}
            </span>
          )}
        </div>
        <Link 
          href="/guard/main/safety" 
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 text-[0.8125rem] py-2 px-4"
        >
          교육 받기
        </Link>
      </div>
      
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!error && eduStatus && eduStatus.completed < eduStatus.total && (
        <p className="text-[0.8125rem] text-destructive font-medium pt-2 border-t border-border/30">
          미이수 교육이 {eduStatus.total - eduStatus.completed}건 있습니다. 교육을 완료해주세요.
        </p>
      )}
      
      {!error && eduStatus && eduStatus.completed === eduStatus.total && eduStatus.total > 0 && (
        <p className="text-[0.8125rem] text-primary font-medium pt-2 border-t border-border/30">
          모든 안전교육을 이수하였습니다.
        </p>
      )}
    </section>
  );
}

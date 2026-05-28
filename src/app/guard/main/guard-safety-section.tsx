"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";

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
  return () => {};
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
    <section className="mb-6 bg-canvas rounded-[18px] p-6 border border-hairline shadow-sm space-y-4">
      <h3 className="text-[14px] font-semibold text-ink-muted-48">안전교육 상황</h3>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15px] text-ink-muted-80">
          <span className="font-semibold text-ink-muted-48">이수 현황 :</span>
          {loading ? (
            <span className="animate-pulse bg-hairline rounded h-5 w-12" />
          ) : (
            <span className="font-bold text-[20px] text-ink">
              {eduStatus ? `${eduStatus.completed} / ${eduStatus.total}` : "정보 없음"}
            </span>
          )}
        </div>
        <Link 
          href="/guard/main/safty" 
          className="button-secondary text-[13px] py-2 px-4"
        >
          교육 받기
        </Link>
      </div>
      
      {eduStatus && eduStatus.completed < eduStatus.total && (
        <p className="text-[13px] text-status-warn font-medium pt-2 border-t border-hairline/30">
          미이수 교육이 {eduStatus.total - eduStatus.completed}건 있습니다. 교육을 완료해주세요.
        </p>
      )}
      
      {eduStatus && eduStatus.completed === eduStatus.total && eduStatus.total > 0 && (
        <p className="text-[13px] text-primary font-medium pt-2 border-t border-hairline/30">
          모든 안전교육을 이수하였습니다.
        </p>
      )}
    </section>
  );
}

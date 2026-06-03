"use client";

import { useMemo, useSyncExternalStore } from "react";

type GuardSession = {
  worksite?: {
    name?: unknown;
  } | null;
  assignment?: {
    start_date?: unknown;
    end_date?: unknown;
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

export default function GuardWorksiteSection() {
  const storedSession = useSyncExternalStore(
    subscribeToSessionChange,
    readGuardSessionSnapshot,
    () => null,
  );

  const sessionData = useMemo(() => {
    if (!storedSession) return null;
    try {
      const session = JSON.parse(storedSession) as GuardSession;
      const worksiteName = typeof session.worksite?.name === "string" ? session.worksite.name : null;
      const startDate = typeof session.assignment?.start_date === "string" ? session.assignment.start_date : null;
      const endDate = typeof session.assignment?.end_date === "string" ? session.assignment.end_date : null;
      
      return { worksiteName, startDate, endDate };
    } catch {
      return null;
    }
  }, [storedSession]);

  if (!sessionData?.worksiteName) {
    return (
      <section className="mb-6 bg-canvas rounded-[18px] p-6 border border-hairline shadow-sm">
        <p className="text-[17px] font-semibold text-ink-muted-48 text-center py-2">
          배정된 근무지 정보가 없습니다
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6 bg-canvas rounded-[18px] p-6 border border-hairline shadow-sm space-y-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[14px] font-semibold text-ink-muted-48">오늘의 근무지 :</h3>
        <p className="text-[21px] font-bold text-primary">
          {sessionData.worksiteName}
        </p>
      </div>
      {sessionData.startDate && (
        <div className="flex items-center gap-2 text-[13px] text-ink-muted-48 border-t border-hairline/30 pt-2">
          <span className="font-semibold w-[80px]">배정기간 :</span>
          <span className="font-medium">
            {sessionData.startDate === sessionData.endDate 
              ? sessionData.startDate 
              : `${sessionData.startDate} ~ ${sessionData.endDate}`}
          </span>
        </div>
      )}
    </section>
  );
}

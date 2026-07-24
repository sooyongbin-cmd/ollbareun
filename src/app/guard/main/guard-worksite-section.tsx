"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";

type GuardSession = {
  isDayOff?: boolean;
  worksite?: {
    name?: unknown;
  } | null;
  assignment?: {
    start_date?: unknown;
    end_date?: unknown;
  } | null;
};

function readGuardSessionSnapshot() {
  return readStoredGuardSessionSnapshot();
}

function subscribeToSessionChange(onStoreChange: () => void) {
  return subscribeToGuardSessionChange(onStoreChange);
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
      
      return { worksiteName, startDate, endDate, isDayOff: session.isDayOff === true };
    } catch {
      return null;
    }
  }, [storedSession]);

  if (!sessionData?.worksiteName) {
    return (
      <section className="mb-6 bg-background rounded-xl p-6 border border-border shadow-sm">
        <p className="text-[17px] font-semibold text-muted-foreground text-center py-2">
          배정된 근무지 정보가 없습니다
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6 bg-background rounded-xl p-6 border border-border shadow-sm space-y-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[14px] font-semibold text-muted-foreground">오늘의 근무지 :</h3>
        <p className="text-[21px] font-bold text-primary">
          {sessionData.worksiteName}
        </p>
      </div>
      {sessionData.isDayOff ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm font-semibold text-primary">
          오늘은 지정된 휴무일입니다.
        </p>
      ) : null}
      {sessionData.startDate && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground border-t border-border/30 pt-2">
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

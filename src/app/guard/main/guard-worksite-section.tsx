"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

type GuardSession = {
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
      
      return { worksiteName, startDate, endDate };
    } catch {
      return null;
    }
  }, [storedSession]);

  if (!sessionData?.worksiteName) {
    return (
      <Card className="w-full shadow-sm border">
        <CardContent className="py-6 text-center text-sm font-medium text-muted-foreground">
          배정된 근무지 정보가 없습니다
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-sm border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <MapPin className="size-4 text-primary" />
          <span>오늘의 근무지</span>
        </div>
        <CardTitle className="text-xl font-bold text-primary">
          {sessionData.worksiteName}
        </CardTitle>
      </CardHeader>
      {sessionData.startDate && (
        <CardContent className="pt-0 border-t border-border/40 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-2 pt-3">
            <span className="font-medium shrink-0">배정기간 :</span>
            <span className="font-semibold text-foreground">
              {sessionData.startDate === sessionData.endDate 
                ? sessionData.startDate 
                : `${sessionData.startDate} ~ ${sessionData.endDate}`}
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

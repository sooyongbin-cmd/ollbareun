"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { GuardStatusAlert } from "@/components/guard/guard-status-alert";

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
    <Card className="w-full shadow-sm border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            <span>안전교육 상황</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs px-2">
            <Link href="/guard/main/safety">
              <span>교육 받기</span>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
        <CardTitle className="text-lg font-bold">
          {loading ? (
            <Skeleton className="h-7 w-24 rounded-md mt-1" />
          ) : (
            <span className="text-xl font-bold text-foreground">
              {eduStatus ? `${eduStatus.completed} / ${eduStatus.total}` : "정보 없음"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 pt-0">
        {eduStatus && eduStatus.completed < eduStatus.total && (
          <GuardStatusAlert
            status="warning"
            title="미이수 안내"
            description={`미이수 교육이 ${eduStatus.total - eduStatus.completed}건 있습니다. 교육을 완료해주세요.`}
          />
        )}
        
        {eduStatus && eduStatus.completed === eduStatus.total && eduStatus.total > 0 && (
          <GuardStatusAlert
            status="success"
            title="이수 완료"
            description="모든 안전교육을 이수하였습니다."
          />
        )}
      </CardContent>
    </Card>
  );
}

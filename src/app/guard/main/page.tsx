"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import GuardWorksiteSection from "./guard-worksite-section";
import GuardAttendanceSection from "./guard-attendance-section";
import GuardSafetySection from "./guard-safety-section";
import GuardPushRegister from "./guard-push-register";
import GuardLocationGateLink from "./guard-location-gate-link";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";
import {
  GUARD_WORK_MENUS,
  getGuardMenuTitle,
  isGuardMenuVisibleForRole,
} from "@/components/guard/guard-menu-config";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";

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

  const visibleMenus = useMemo(() => {
    return GUARD_WORK_MENUS.filter((menu) => isGuardMenuVisibleForRole(menu, role));
  }, [role]);

  return (
    <div className="w-full space-y-6">
      {/* 1. Today's Worksite Card */}
      <GuardWorksiteSection />
      
      {/* 2. Main Task Buttons Card */}
      <Card className="w-full shadow-sm border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Briefcase className="size-4 text-primary" />
            <span>주요 업무</span>
          </div>
          <CardTitle className="text-lg font-bold mt-1">업무 바로가기</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {visibleMenus.map((menu) => {
              const title = getGuardMenuTitle(menu, role);
              const IconComp = menu.icon;

              if (menu.requiresLocation) {
                return (
                  <GuardLocationGateLink
                    key={menu.href}
                    href={menu.href}
                    hasAssignedWorksite={hasAssignedWorksite}
                    icon={<IconComp className="size-5" />}
                  >
                    {title}
                  </GuardLocationGateLink>
                );
              }

              if (menu.requiresWorksite) {
                return (
                  <GuardLocationGateLink
                    key={menu.href}
                    href={menu.href}
                    hasAssignedWorksite={hasAssignedWorksite}
                    icon={<IconComp className="size-5" />}
                  >
                    {title}
                  </GuardLocationGateLink>
                );
              }

              return (
                <Button
                  key={menu.href}
                  asChild
                  variant="outline"
                  className="w-full min-h-[48px] text-base font-semibold justify-center gap-2 border-input bg-background shadow-xs hover:bg-accent"
                >
                  <Link href={menu.href}>
                    <IconComp className="size-5 shrink-0" />
                    <span>{title}</span>
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. Safety Education Status Card */}
      <GuardSafetySection />

      {/* 4. Attendance Status Card */}
      <GuardAttendanceSection />

      {/* 5. Push Registration Status Card */}
      <GuardPushRegister />
    </div>
  );
}

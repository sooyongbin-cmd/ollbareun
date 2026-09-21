"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CircleAlert,
  GraduationCap,
  MapPinned,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DashboardPayload = {
  summary: {
    scheduledEmployeesToday: number;
    currentlyClockedIn: number;
    onTimeEmployeesToday: number;
    waitingEmployeesToday: number;
    absentEmployeesToday: number;
    lateEmployeesToday: number;
    educationUncompleted: number;
    educationRate: number;
    employeeRoleCounts: {
      guard: number;
      cleaner: number;
      dispatched: number;
    };
    unprocessedSpecialRemarks: number;
  };
  specialRemarkFeed: {
    id: string;
    category: "청소" | "시설" | "파견";
    worksiteName: string;
    reportedAt: string;
    content: string;
  }[];
  worksiteMonitoring: {
    worksiteId: string;
    employeeRole: "경비원" | "미화원" | "파견";
    worksiteName: string;
    attendanceCount: number;
    assignedCount: number;
    inspectedSiteCount: number;
    inspectionSiteCount: number;
  }[];
};

const emptyDashboard: DashboardPayload = {
  summary: {
    scheduledEmployeesToday: 0,
    currentlyClockedIn: 0,
    onTimeEmployeesToday: 0,
    waitingEmployeesToday: 0,
    absentEmployeesToday: 0,
    lateEmployeesToday: 0,
    educationUncompleted: 0,
    educationRate: 0,
    employeeRoleCounts: {
      guard: 0,
      cleaner: 0,
      dispatched: 0,
    },
    unprocessedSpecialRemarks: 0,
  },
  specialRemarkFeed: [],
  worksiteMonitoring: [],
};

function formatTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function formatInspectionProgress(inspectedSiteCount: number, inspectionSiteCount: number) {
  if (inspectionSiteCount <= 0) {
    return "0%";
  }

  return `${Math.round((inspectedSiteCount / inspectionSiteCount) * 100)}%`;
}

function getSpecialRemarkTone(category: DashboardPayload["specialRemarkFeed"][number]["category"]) {
  if (category === "청소") {
    return "border-l-red-500 bg-red-50/80 dark:bg-red-950/20";
  }

  if (category === "시설") {
    return "border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/20";
  }

  return "border-l-sky-500 bg-sky-50/80 dark:bg-sky-950/20";
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="대시보드를 불러오는 중입니다." className="space-y-6">
      <span className="sr-only">대시보드를 불러오는 중입니다.</span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="gap-4">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-52 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

type SummaryCard = {
  label: string;
  value: ReactNode;
  description: ReactNode;
  ariaLabel?: string;
  icon: typeof Users;
  href?: string;
};

function DashboardSummaryCard({ card }: { card: SummaryCard }) {
  const content = (
    <Card className="gap-4 bg-gradient-to-t from-primary/[0.035] to-card transition-shadow group-hover:shadow-md">
      <CardHeader>
        <CardDescription>{card.label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums md:text-3xl">{card.value}</CardTitle>
        <CardAction>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <card.icon aria-hidden="true" className="size-4" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{card.description}</CardContent>
    </Card>
  );

  if (card.href) {
    return (
      <Link
        aria-label={card.ariaLabel ?? `${card.label} ${card.value} ${card.description}`}
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        href={card.href}
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default function ManagerPage() {
  const [data, setData] = useState<DashboardPayload>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        const response = await fetch("/api/manager/dashboard");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "대시보드 자료를 불러오지 못했습니다.");
        }

        if (!ignore) {
          setData({
            summary: {
              ...emptyDashboard.summary,
              ...(payload.summary ?? {}),
              employeeRoleCounts: {
                ...emptyDashboard.summary.employeeRoleCounts,
                ...(payload.summary?.employeeRoleCounts ?? {}),
              },
            },
            specialRemarkFeed: payload.specialRemarkFeed ?? [],
            worksiteMonitoring: payload.worksiteMonitoring ?? [],
          });
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "대시보드 자료를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>대시보드를 표시할 수 없습니다.</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const summaryCards: SummaryCard[] = [
    {
      label: "출근현황",
      value: (
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[1.35rem] md:text-[1.5rem]">
          <span>출근 {data.summary.onTimeEmployeesToday}</span>
          <span className="text-pink-600 dark:text-pink-400">지각 {data.summary.lateEmployeesToday}</span>
          <span className="text-red-600 dark:text-red-400">결근{data.summary.absentEmployeesToday}</span>
          <span>대기 {data.summary.waitingEmployeesToday}</span>
        </span>
      ),
      description: "오늘 근태기록의 출근상태 기준",
      ariaLabel: `출근현황 출근 ${data.summary.onTimeEmployeesToday} 지각 ${data.summary.lateEmployeesToday} 결근${data.summary.absentEmployeesToday} 대기 ${data.summary.waitingEmployeesToday}`,
      icon: Users,
      href: "/manager/reports/attendance/status",
    },
    {
      label: "직군별 인원배정",
      value: (
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[1.15rem] md:text-[1.3rem]">
          <span>경비원 {data.summary.employeeRoleCounts.guard}명</span>
          <span aria-hidden="true" className="text-muted-foreground">/</span>
          <span>미화원 {data.summary.employeeRoleCounts.cleaner}명</span>
          <span aria-hidden="true" className="text-muted-foreground">/</span>
          <span>파견 {data.summary.employeeRoleCounts.dispatched}명</span>
        </span>
      ),
      description: "재직 직원 직군별 인원",
      ariaLabel: `직군별 인원배정 경비원 ${data.summary.employeeRoleCounts.guard}명 미화원 ${data.summary.employeeRoleCounts.cleaner}명 파견 ${data.summary.employeeRoleCounts.dispatched}명`,
      icon: Users,
      href: "/manager/employee/employees",
    },
    {
      label: "안전교육 이수율",
      value: `${data.summary.educationRate}%`,
      description: `안전교육 미이수 ${data.summary.educationUncompleted}명`,
      ariaLabel: `안전교육 이수율 ${data.summary.educationRate}% 안전교육 미이수 ${data.summary.educationUncompleted}명`,
      icon: GraduationCap,
      href: "/manager/safety/completions",
    },
    {
      label: "특이사항",
      value: `${data.summary.unprocessedSpecialRemarks}건`,
      description: "긴급 조치 요구됨",
      ariaLabel: `특이사항 ${data.summary.unprocessedSpecialRemarks}건 긴급 조치 요구됨`,
      icon: CircleAlert,
      href: "/manager/inspection/special-remarks",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">대시보드</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          직원 배치와 출근, 안전교육 현황을 한눈에 확인합니다.
        </p>
      </div>

      <section aria-label="운영 요약" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <DashboardSummaryCard key={card.label} card={card} />
        ))}
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <Card role="region" aria-label="직군별 현장 실시간 관제" className="min-w-0">
          <CardHeader className="border-b">
            <CardTitle>
              <h2 className="flex items-center gap-2 text-base">
                <MapPinned aria-hidden="true" className="size-4 text-primary" />
                직군별 현장 실시간 관제
              </h2>
            </CardTitle>
            <CardDescription>오늘 직군별 출근 인원과 현장점검 진행 현황을 표시합니다.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 px-0">
            <div className="min-w-0 overflow-x-auto">
              <Table className="min-w-[42.5rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>직군</TableHead>
                    <TableHead>근무지명</TableHead>
                    <TableHead className="text-right">출근인원</TableHead>
                    <TableHead className="text-right">진행률</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.worksiteMonitoring.length === 0 ? (
                    <TableRow>
                      <TableCell data-responsive-empty colSpan={4} className="h-28 text-center text-muted-foreground">
                        등록된 인원 배정이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.worksiteMonitoring.map((worksite) => (
                      <TableRow key={`${worksite.worksiteId}-${worksite.employeeRole}`}>
                        <TableCell data-label="직군" className="font-medium">{worksite.employeeRole}</TableCell>
                        <TableCell data-label="근무지명">{worksite.worksiteName}</TableCell>
                        <TableCell data-label="출근인원" className="text-right font-mono tabular-nums">
                          {worksite.attendanceCount}/{worksite.assignedCount}
                        </TableCell>
                        <TableCell data-label="진행률" className="text-right font-mono tabular-nums">
                          {formatInspectionProgress(worksite.inspectedSiteCount, worksite.inspectionSiteCount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card role="region" aria-label="실시간 특이사항 및 긴급피드" className="min-w-0">
          <CardHeader className="border-b">
            <CardTitle>
              <h2 className="flex items-center gap-2 text-base">
                <CircleAlert aria-hidden="true" className="size-4 text-primary" />
                실시간 특이사항 및 긴급피드
              </h2>
            </CardTitle>
            <CardDescription>미처리 특이사항을 최근 신고 순으로 표시합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.specialRemarkFeed.length === 0 ? (
              <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                현재 미처리 특이사항이 없습니다.
              </div>
            ) : (
              data.specialRemarkFeed.map((remark) => (
                <Link
                  key={remark.id}
                  className={`block rounded-md border border-border/40 border-l-4 px-3 py-2.5 transition-colors hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${getSpecialRemarkTone(remark.category)}`}
                  href={`/manager/inspection/special-remarks/${encodeURIComponent(remark.id)}`}
                >
                  <p className="text-sm font-semibold leading-5 text-foreground">
                    [{remark.category} | {remark.worksiteName}] {formatTime(remark.reportedAt)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-5 text-foreground/90">&quot;{remark.content}&quot;</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

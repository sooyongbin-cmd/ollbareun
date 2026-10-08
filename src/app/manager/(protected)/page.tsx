"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
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
    totalEmployees: number;
    scheduledEmployeesToday: number;
    currentlyClockedIn: number;
    onTimeEmployeesToday: number;
    waitingEmployeesToday: number;
    absentEmployeesToday: number;
    lateEmployeesToday: number;
    clockedOutEmployeesToday: number;
    earlyLeaveEmployeesToday: number;
    notClockedOutEmployeesToday: number;
    onLeaveEmployeesToday: number;
    attendanceRate: number;
    educationCompleted: number;
    educationUncompleted: number;
    educationRate: number;
    employeeRoleCounts: { role: string; count: number }[];
    workStyleCounts: Record<"0" | "1" | "2", number>;
    unprocessedSpecialRemarks: number;
  };
  worksiteMonitoring: {
    worksiteId: string;
    employeeRole: string;
    worksiteName: string;
    attendanceCount: number;
    assignedCount: number;
    inspectedSiteCount: number;
    inspectionSiteCount: number;
  }[];
  weeklyLeaveStatus: {
    id: string;
    employeeName: string;
    employeeRole: string;
    workStyle: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    worksiteName: string;
    assignmentStartDate: string | null;
    assignmentEndDate: string | null;
  }[];
};

const emptyDashboard: DashboardPayload = {
  summary: {
    totalEmployees: 0,
    scheduledEmployeesToday: 0,
    currentlyClockedIn: 0,
    onTimeEmployeesToday: 0,
    waitingEmployeesToday: 0,
    absentEmployeesToday: 0,
    lateEmployeesToday: 0,
    clockedOutEmployeesToday: 0,
    earlyLeaveEmployeesToday: 0,
    notClockedOutEmployeesToday: 0,
    onLeaveEmployeesToday: 0,
    attendanceRate: 0,
    educationCompleted: 0,
    educationUncompleted: 0,
    educationRate: 0,
    employeeRoleCounts: [],
    workStyleCounts: { "0": 0, "1": 0, "2": 0 },
    unprocessedSpecialRemarks: 0,
  },
  worksiteMonitoring: [],
  weeklyLeaveStatus: [],
};

const workStyleOptions = [
  { code: "0", label: "일반근무" },
  { code: "1", label: "격일근무" },
  { code: "2", label: "야간근무" },
] as const;

function formatInspectionProgress(inspectedSiteCount: number, inspectionSiteCount: number) {
  if (inspectionSiteCount <= 0) {
    return "0%";
  }

  return `${Math.round((inspectedSiteCount / inspectionSiteCount) * 100)}%`;
}

function formatPeriod(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) {
    return "-";
  }

  return startDate === endDate ? startDate : `${startDate} ~ ${endDate}`;
}

function aggregateWorksiteMonitoring(worksites: DashboardPayload["worksiteMonitoring"]) {
  const monitoringByWorksite = new Map<string, DashboardPayload["worksiteMonitoring"][number]>();

  for (const worksite of worksites) {
    const current = monitoringByWorksite.get(worksite.worksiteId);
    if (!current) {
      monitoringByWorksite.set(worksite.worksiteId, { ...worksite });
      continue;
    }

    current.attendanceCount += worksite.attendanceCount;
    current.assignedCount += worksite.assignedCount;
    current.inspectedSiteCount = Math.max(current.inspectedSiteCount, worksite.inspectedSiteCount);
    current.inspectionSiteCount = Math.max(current.inspectionSiteCount, worksite.inspectionSiteCount);
  }

  return Array.from(monitoringByWorksite.values());
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="대시보드를 불러오는 중입니다." className="space-y-6">
      <span className="sr-only">대시보드를 불러오는 중입니다.</span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="manager-section gap-4">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card className="manager-section" key={index}>
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
    <Card className="manager-section h-full gap-4 bg-gradient-to-t from-primary/[0.035] to-card transition-shadow group-hover:shadow-md">
      <CardHeader>
        <CardDescription>{card.label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums md:text-3xl">{card.value}</CardTitle>
        <CardAction>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <card.icon aria-hidden="true" className="size-4" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="mt-auto text-xs text-muted-foreground">{card.description}</CardContent>
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
              employeeRoleCounts: Array.isArray(payload.summary?.employeeRoleCounts)
                ? payload.summary.employeeRoleCounts
                : [],
              workStyleCounts: {
                ...emptyDashboard.summary.workStyleCounts,
                ...(payload.summary?.workStyleCounts ?? {}),
              },
            },
            worksiteMonitoring: payload.worksiteMonitoring ?? [],
            weeklyLeaveStatus: payload.weeklyLeaveStatus ?? [],
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
          <span>대기 {data.summary.waitingEmployeesToday}</span>
          <span>출근 {data.summary.onTimeEmployeesToday}</span>
          <span className="text-pink-600 dark:text-pink-400">지각 {data.summary.lateEmployeesToday}</span>
          <span className="text-red-600 dark:text-red-400">결근 {data.summary.absentEmployeesToday}</span>
          <span>퇴근 {data.summary.clockedOutEmployeesToday}</span>
          <span className="text-amber-600 dark:text-amber-400">조퇴 {data.summary.earlyLeaveEmployeesToday}</span>
          <span>미퇴근 {data.summary.notClockedOutEmployeesToday}</span>
          <span>휴가 {data.summary.onLeaveEmployeesToday}</span>
        </span>
      ),
      description: `총인원 ${data.summary.totalEmployees}명 출근예정 ${data.summary.scheduledEmployeesToday}명 출근율 ${data.summary.attendanceRate}%`,
      ariaLabel: `출근현황 대기 ${data.summary.waitingEmployeesToday} 출근 ${data.summary.onTimeEmployeesToday} 지각 ${data.summary.lateEmployeesToday} 결근 ${data.summary.absentEmployeesToday} 퇴근 ${data.summary.clockedOutEmployeesToday} 조퇴 ${data.summary.earlyLeaveEmployeesToday} 미퇴근 ${data.summary.notClockedOutEmployeesToday} 휴가 ${data.summary.onLeaveEmployeesToday} 총인원 ${data.summary.totalEmployees}명 출근예정 ${data.summary.scheduledEmployeesToday}명 출근율 ${data.summary.attendanceRate}%`,
      icon: Users,
      href: "/manager/reports/attendance",
    },
    {
      label: "직군별 인원배정",
      value: (
        <span className="flex flex-col gap-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[1.15rem] md:text-[1.3rem]">
            {data.summary.employeeRoleCounts.map(({ role, count }, index) => (
              <span className="inline-flex items-baseline gap-x-2" key={role}>
                {index > 0 && <span aria-hidden="true" className="text-muted-foreground">/</span>}
                <span>{role} {count}명</span>
              </span>
            ))}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[1rem] text-muted-foreground md:text-[1.1rem]">
            {workStyleOptions.map(({ code, label }, index) => (
              <span className="inline-flex items-baseline gap-x-2" key={code}>
                {index > 0 && <span aria-hidden="true">/</span>}
                <span>{label} {data.summary.workStyleCounts[code]}명</span>
              </span>
            ))}
          </span>
        </span>
      ),
      description: "재직 직원 직군 및 근무형태별 인원",
      ariaLabel: `직군별 인원배정 ${data.summary.employeeRoleCounts.map(({ role, count }) => `${role} ${count}명`).join(" ")} 근무형태별 인원 ${workStyleOptions.map(({ code, label }) => `${label} ${data.summary.workStyleCounts[code]}명`).join(" ")}`,
      icon: Users,
      href: "/manager/employee/employees",
    },
    {
      label: "안전교육 월별이수율",
      value: `${data.summary.educationRate}%`,
      description: `안전교육 이수 ${data.summary.educationCompleted}건 미이수 ${data.summary.educationUncompleted}건`,
      ariaLabel: `안전교육 월별이수율 ${data.summary.educationRate}% 안전교육 이수 ${data.summary.educationCompleted}건 미이수 ${data.summary.educationUncompleted}건`,
      icon: GraduationCap,
      href: "/manager/safety/monthly_edu",
    },
    {
      label: "미처리 특이사항",
      value: `${data.summary.unprocessedSpecialRemarks}건`,
      description: "긴급 조치 요구됨",
      ariaLabel: `미처리 특이사항 ${data.summary.unprocessedSpecialRemarks}건 긴급 조치 요구됨`,
      icon: CircleAlert,
      href: "/manager/inspection/special-remarks",
    },
  ];

  const worksiteMonitoring = aggregateWorksiteMonitoring(data.worksiteMonitoring);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">대시보드</h1>
      </div>

      <section aria-label="운영 요약" className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <DashboardSummaryCard key={card.label} card={card} />
        ))}
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <Card role="region" aria-label="금주 휴가현황" className="manager-section min-w-0">
        <CardHeader className="border-b">
          <CardTitle>
            <h2 className="flex items-center gap-2 text-base">
              <CalendarDays aria-hidden="true" className="size-4 text-primary" />
              금주 휴가현황
            </h2>
          </CardTitle>
          <CardDescription>이번 주에 휴가 기간이 포함된 목록을 표시합니다.</CardDescription>
          <CardAction>
            <Link className="text-sm font-medium text-primary hover:underline" href="/manager/leave">
              전체보기
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="min-w-0 px-0">
          <div className="min-w-0 overflow-x-auto">
            <Table className="min-w-[58rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>직군</TableHead>
                  <TableHead>근무형태</TableHead>
                  <TableHead>휴가종류</TableHead>
                  <TableHead>휴가기간</TableHead>
                  <TableHead>근무지</TableHead>
                  <TableHead>배정기간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.weeklyLeaveStatus.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={7} className="h-28 text-center text-muted-foreground">
                      이번 주 휴가 일정이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.weeklyLeaveStatus.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell data-label="이름" className="font-semibold">
                        <Link className="text-primary hover:underline" href="/manager/leave">
                          {row.employeeName}
                        </Link>
                      </TableCell>
                      <TableCell data-label="직군">{row.employeeRole}</TableCell>
                      <TableCell data-label="근무형태">{row.workStyle}</TableCell>
                      <TableCell data-label="휴가종류">{row.leaveType}</TableCell>
                      <TableCell data-label="휴가기간" className="whitespace-nowrap">{formatPeriod(row.startDate, row.endDate)}</TableCell>
                      <TableCell data-label="근무지">{row.worksiteName}</TableCell>
                      <TableCell data-label="배정기간" className="whitespace-nowrap">
                        {formatPeriod(row.assignmentStartDate, row.assignmentEndDate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        </Card>

        <Card role="region" aria-label="점검지 점검 현황" className="manager-section min-w-0">
          <CardHeader className="border-b">
            <CardTitle>
              <h2 className="flex items-center gap-2 text-base">
                <MapPinned aria-hidden="true" className="size-4 text-primary" />
                점검지 점검 현황
              </h2>
            </CardTitle>
            <CardDescription>오늘 근무지별 출근 인원과 점검지 점검 진행 현황을 표시합니다.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 px-0">
            <div className="min-w-0 overflow-x-auto">
              <Table className="min-w-[32.5rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>근무지명</TableHead>
                    <TableHead className="text-right">출근인원</TableHead>
                    <TableHead className="text-right">진행률</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.worksiteMonitoring.length === 0 ? (
                    <TableRow>
                      <TableCell data-responsive-empty colSpan={3} className="h-28 text-center text-muted-foreground">
                        등록된 인원 배정이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    worksiteMonitoring.map((worksite) => (
                      <TableRow key={worksite.worksiteId}>
                        <TableCell data-label="근무지명">
                          <Link className="font-medium text-primary hover:underline" href="/manager/inspection/sites">
                            {worksite.worksiteName}
                          </Link>
                        </TableCell>
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
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  CircleAlert,
  GraduationCap,
  MapPinned,
  TrendingUp,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
    educationUncompleted: number;
  };
  dailyRates: {
    date: string;
    attendanceRate: number;
    educationRate: number;
  }[];
  liveAttendance: {
    employeeName: string;
    worksiteName: string;
    clockInAt: string | null;
    educationStatus: "완료" | "미이수";
    attendanceStatus: "출근" | "퇴근";
  }[];
  worksiteAssignments: {
    worksiteId: string;
    worksiteName: string;
    assignedCount: number;
  }[];
};

const emptyDashboard: DashboardPayload = {
  summary: {
    scheduledEmployeesToday: 0,
    currentlyClockedIn: 0,
    educationUncompleted: 0,
  },
  dailyRates: [],
  liveAttendance: [],
  worksiteAssignments: [],
};

const chartConfig = {
  attendanceRate: {
    label: "출근율",
    color: "var(--chart-1)",
  },
  educationRate: {
    label: "교육 이수율",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

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

function formatShortDate(value: string) {
  const [, month = "", day = ""] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatLongDate(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
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
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[18.75rem] w-full" />
        </CardContent>
      </Card>
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

function DashboardTrendChart({ data }: { data: DashboardPayload["dailyRates"] }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2 className="text-base">최근 30일 운영 추이</h2>
        </CardTitle>
        <CardDescription>출근율과 안전교육 이수율을 날짜별로 비교합니다.</CardDescription>
        <CardAction>
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <TrendingUp aria-hidden="true" className="size-3" />
            30일
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-6">
        {data.length === 0 ? (
          <div className="flex h-[18.75rem] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            표시할 추이 데이터가 없습니다.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-[18.75rem] w-full aspect-auto"
            role="img"
            aria-label="최근 30일 출근율과 안전교육 이수율 비교 차트"
            data-testid="dashboard-trend-chart"
          >
            <AreaChart accessibilityLayer data={data} margin={{ left: 0, right: 12, top: 8 }}>
              <defs>
                <linearGradient id="attendance-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-attendanceRate)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-attendanceRate)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="education-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-educationRate)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-educationRate)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="date"
                minTickGap={28}
                tickFormatter={formatShortDate}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                domain={[0, 100]}
                tickCount={6}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                width={42}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_, payload) =>
                      formatLongDate(String(payload[0]?.payload?.date ?? ""))
                    }
                    formatter={(value, name) => (
                      <div className="flex w-full min-w-32 items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                        </span>
                        <span className="font-mono font-medium tabular-nums">{Number(value)}%</span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="attendanceRate"
                fill="url(#attendance-fill)"
                stroke="var(--color-attendanceRate)"
                strokeWidth={2}
                type="monotone"
              />
              <Area
                dataKey="educationRate"
                fill="url(#education-fill)"
                stroke="var(--color-educationRate)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

type SummaryCard = {
  label: string;
  value: string;
  description: string;
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
        aria-label={`${card.label} ${card.value} ${card.description}`}
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
            summary: payload.summary ?? emptyDashboard.summary,
            dailyRates: payload.dailyRates ?? [],
            liveAttendance: payload.liveAttendance ?? [],
            worksiteAssignments: payload.worksiteAssignments ?? [],
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

  const todayAttendanceRate = data.dailyRates.at(-1)?.attendanceRate ?? 0;
  const attendanceRate = data.summary.scheduledEmployeesToday > 0
    ? Math.round((data.summary.currentlyClockedIn / data.summary.scheduledEmployeesToday) * 100)
    : 0;
  const summaryCards: SummaryCard[] = [
    {
      label: "출근현황",
      value: `${data.summary.currentlyClockedIn}/${data.summary.scheduledEmployeesToday} 명`,
      description: `출근율 ${attendanceRate}%`,
      icon: Users,
      href: "/manager/reports/attendance/status",
    },
    {
      label: "현재 출근",
      value: `${data.summary.currentlyClockedIn}명`,
      description: "오늘 출근 후 근무 중",
      icon: UserRoundCheck,
    },
    {
      label: "교육 미이수",
      value: `${data.summary.educationUncompleted}명`,
      description: "필수 안전교육 확인 필요",
      icon: GraduationCap,
    },
    {
      label: "오늘 출근율",
      value: `${todayAttendanceRate}%`,
      description: "전체 재직 직원 기준",
      icon: TrendingUp,
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

      <DashboardTrendChart data={data.dailyRates} />

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <Card role="region" aria-label="현장별 인원 배치" className="min-w-0">
          <CardHeader className="border-b">
            <CardTitle>
              <h2 className="flex items-center gap-2 text-base">
                <MapPinned aria-hidden="true" className="size-4 text-primary" />
                현장별 인원 배치
              </h2>
            </CardTitle>
            <CardDescription>현재 배정 기간에 포함된 인원을 집계합니다.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 px-0">
            <div className="min-w-0 overflow-x-auto">
              <Table className="min-w-[26.25rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>근무지명</TableHead>
                    <TableHead className="text-right">배정인원수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.worksiteAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell data-responsive-empty colSpan={2} className="h-28 text-center text-muted-foreground">
                        등록된 근무지가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.worksiteAssignments.map((worksite) => (
                      <TableRow key={worksite.worksiteId}>
                        <TableCell data-label="근무지명" className="font-medium">{worksite.worksiteName}</TableCell>
                        <TableCell data-label="배정인원수" className="text-right">
                          {worksite.assignedCount > 0 ? (
                            <Link
                              className="font-semibold text-primary hover:underline"
                              href={`/manager/employee/assignments?worksite=${encodeURIComponent(worksite.worksiteName)}`}
                            >
                              {worksite.assignedCount}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{worksite.assignedCount}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card role="region" aria-label="실시간출근현황 리스트" className="min-w-0">
          <CardHeader className="border-b">
            <CardTitle>
              <h2 className="flex items-center gap-2 text-base">
                <UserRoundCheck aria-hidden="true" className="size-4 text-primary" />
                실시간 출근 현황
              </h2>
            </CardTitle>
            <CardDescription>오늘 출근 기록을 최근 시간순으로 표시합니다.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 px-0">
            <div className="min-w-0 overflow-x-auto">
              <Table className="min-w-[42.5rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>성명</TableHead>
                    <TableHead>현장명</TableHead>
                    <TableHead>출근시간</TableHead>
                    <TableHead>교육여부</TableHead>
                    <TableHead>출근상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.liveAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell data-responsive-empty colSpan={5} className="h-28 text-center text-muted-foreground">
                        현재 출근 기록이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.liveAttendance.map((row, index) => (
                      <TableRow key={`${row.employeeName}-${row.clockInAt ?? index}`}>
                        <TableCell data-label="성명" className="font-medium">{row.employeeName}</TableCell>
                        <TableCell data-label="현장명">{row.worksiteName}</TableCell>
                        <TableCell data-label="출근시간" className="font-mono text-xs">{formatTime(row.clockInAt)}</TableCell>
                        <TableCell data-label="교육여부">
                          <Badge
                            variant="outline"
                            className={
                              row.educationStatus === "완료"
                                ? "border-primary/20 bg-primary/10 text-primary"
                                : "border-destructive/20 bg-destructive/10 text-destructive"
                            }
                          >
                            {row.educationStatus}
                          </Badge>
                        </TableCell>
                        <TableCell data-label="출근상태">
                          <Badge
                            variant={row.attendanceStatus === "출근" ? "default" : "secondary"}
                          >
                            {row.attendanceStatus}
                          </Badge>
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

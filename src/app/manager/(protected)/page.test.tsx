import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerPage from "./page";

const dashboardPayload = {
  summary: {
    scheduledEmployeesToday: 5,
    currentlyClockedIn: 3,
    educationUncompleted: 3,
  },
  dailyRates: [
    { date: "2026-06-03", attendanceRate: 50, educationRate: 70 },
    { date: "2026-06-04", attendanceRate: 60, educationRate: 80 },
  ],
  liveAttendance: [
    {
      employeeName: "김철수",
      worksiteName: "문현동현장",
      clockInAt: "2026-06-04T00:00:00.000Z",
      educationStatus: "완료",
      attendanceStatus: "출근",
    },
  ],
  worksiteAssignments: [
    { worksiteId: "work-1", worksiteName: "문현동현장", assignedCount: 2 },
    { worksiteId: "work-2", worksiteName: "센텀현장", assignedCount: 0 },
  ],
};

describe("manager dashboard page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/api/manager/dashboard")) {
          return Response.json(dashboardPayload);
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders four summary cards, a comparison chart, and both data tables", async () => {
    render(<ManagerPage />);

    expect(await screen.findByRole("heading", { name: "대시보드" })).toBeInTheDocument();

    const summary = screen.getByRole("region", { name: "운영 요약" });
    const attendanceCard = within(summary).getByRole("link", { name: "출근현황 3/5 명 출근율 60%" });
    expect(attendanceCard).toHaveAttribute("href", "/manager/reports/attendance");
    expect(within(attendanceCard).getByText("출근현황")).toBeInTheDocument();
    expect(within(attendanceCard).getByText("3/5 명")).toBeInTheDocument();
    expect(within(attendanceCard).getByText("출근율 60%")).toBeInTheDocument();
    expect(within(summary).getByText("현재 출근")).toBeInTheDocument();
    expect(within(summary).getAllByText("3명")).toHaveLength(2);
    expect(within(summary).getByText("교육 미이수")).toBeInTheDocument();
    expect(within(summary).getByText("오늘 출근율")).toBeInTheDocument();
    expect(within(summary).getByText("60%")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "최근 30일 운영 추이" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "최근 30일 출근율과 안전교육 이수율 비교 차트" }),
    ).toHaveAttribute("data-testid", "dashboard-trend-chart");

    const assignmentSection = screen.getByRole("region", { name: "현장별 인원 배치" });
    expect(within(assignmentSection).getByRole("columnheader", { name: "근무지명" })).toBeInTheDocument();
    expect(within(assignmentSection).getByRole("columnheader", { name: "배정인원수" })).toBeInTheDocument();
    expect(within(assignmentSection).getByText("문현동현장")).toBeInTheDocument();
    expect(within(assignmentSection).getByText("센텀현장")).toBeInTheDocument();
    expect(within(assignmentSection).getByRole("link", { name: "2" })).toHaveAttribute(
      "href",
      "/manager/employee/assignments?worksite=%EB%AC%B8%ED%98%84%EB%8F%99%ED%98%84%EC%9E%A5",
    );

    const liveSection = screen.getByRole("region", { name: "실시간출근현황 리스트" });
    expect(within(liveSection).getByRole("columnheader", { name: "성명" })).toBeInTheDocument();
    expect(within(liveSection).getByRole("columnheader", { name: "현장명" })).toBeInTheDocument();
    expect(within(liveSection).getByRole("columnheader", { name: "출근시간" })).toBeInTheDocument();
    expect(within(liveSection).getByRole("columnheader", { name: "교육여부" })).toBeInTheDocument();
    expect(within(liveSection).getByRole("columnheader", { name: "출근상태" })).toBeInTheDocument();
    expect(within(liveSection).getByText("김철수")).toBeInTheDocument();
    expect(within(liveSection).getByText("완료")).toBeInTheDocument();
    expect(within(liveSection).getByText("출근")).toBeInTheDocument();
  });

  it("keeps the integrated chart within the content width", async () => {
    render(<ManagerPage />);

    const chart = await screen.findByRole("img", {
      name: "최근 30일 출근율과 안전교육 이수율 비교 차트",
    });

    expect(chart).toHaveClass("h-[18.75rem]", "w-full", "aspect-auto");
    expect(screen.getAllByTestId("dashboard-trend-chart")).toHaveLength(1);
  });

  it("shows a dashboard-shaped loading state", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<ManagerPage />);

    expect(
      screen.getByRole("status", { name: "대시보드를 불러오는 중입니다." }),
    ).toBeInTheDocument();
  });

  it("shows an alert when the dashboard request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "자료 조회 실패" }, { status: 500 })),
    );

    render(<ManagerPage />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("대시보드를 표시할 수 없습니다.")).toBeInTheDocument();
    expect(within(alert).getByText("자료 조회 실패")).toBeInTheDocument();
  });

  it("handles missing rates and empty table data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          summary: dashboardPayload.summary,
          liveAttendance: [],
          worksiteAssignments: [],
        }),
      ),
    );

    render(<ManagerPage />);

    expect(await screen.findByText("오늘 출근율")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "운영 요약" })).getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("표시할 추이 데이터가 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("등록된 근무지가 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("현재 출근 기록이 없습니다.")).toBeInTheDocument();
  });
});

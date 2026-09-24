import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerPage from "./page";

const dashboardPayload = {
  summary: {
    totalEmployees: 8,
    scheduledEmployeesToday: 5,
    currentlyClockedIn: 3,
    onTimeEmployeesToday: 1,
    waitingEmployeesToday: 1,
    absentEmployeesToday: 2,
    lateEmployeesToday: 1,
    attendanceRate: 40,
    educationUncompleted: 3,
    educationRate: 80,
    employeeRoleCounts: {
      guard: 2,
      cleaner: 1,
      dispatched: 1,
    },
    unprocessedSpecialRemarks: 4,
  },
  specialRemarkFeed: [
    {
      id: "remark-1",
      category: "청소",
      worksiteName: "문현동현장",
      reportedAt: "2026-06-04T01:42:00.000Z",
      content: "세면대 배수구 막힘 및 누수 발생",
    },
    {
      id: "remark-2",
      category: "시설",
      worksiteName: "센텀현장",
      reportedAt: "2026-06-04T01:15:00.000Z",
      content: "변압기 저주파 소음 발생 확인",
    },
  ],
  worksiteMonitoring: [
    {
      worksiteId: "work-1",
      employeeRole: "경비원",
      worksiteName: "문현동현장",
      attendanceCount: 1,
      assignedCount: 2,
      inspectedSiteCount: 1,
      inspectionSiteCount: 2,
    },
    {
      worksiteId: "work-1",
      employeeRole: "미화원",
      worksiteName: "문현동현장",
      attendanceCount: 0,
      assignedCount: 1,
      inspectedSiteCount: 1,
      inspectionSiteCount: 2,
    },
  ],
  attendanceToday: [
    {
      id: "attendance-1",
      worksiteName: "문현동현장",
      employeeName: "김철수",
      scheduledClockIn: "09:00",
      clockInDateTime: "2026-06-04 09:01",
      status: "지각",
    },
  ],
  weeklyLeaveStatus: [
    {
      id: "leave-1",
      employeeName: "김철수",
      employeeRole: "경비원",
      workStyle: "일반근무",
      leaveType: "2",
      startDate: "2026-06-01",
      endDate: "2026-06-02",
      worksiteName: "문현동현장",
      assignmentStartDate: "2026-01-01",
      assignmentEndDate: "2026-12-31",
    },
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

  it("renders four summary cards and both data tables", async () => {
    render(<ManagerPage />);

    expect(await screen.findByRole("heading", { name: "대시보드" })).toBeInTheDocument();

    const summary = screen.getByRole("region", { name: "운영 요약" });
    const attendanceCard = within(summary).getByRole("link", { name: "출근현황 출근 1 지각 1 결근2 대기 1 총인원 8명 출근예정 5명 출근율 40%" });
    expect(attendanceCard).toHaveAttribute("href", "/manager/reports/attendance/status");
    expect(within(attendanceCard).getByText("출근현황")).toBeInTheDocument();
    expect(within(attendanceCard).getByText("출근 1")).toBeInTheDocument();
    expect(within(attendanceCard).getByText("대기 1")).toBeInTheDocument();
    expect(within(attendanceCard).getByText("총인원 8명 출근예정 5명 출근율 40%")).toBeInTheDocument();
    expect(within(attendanceCard).getByText("결근2")).toHaveClass("text-red-600");
    expect(within(attendanceCard).getByText("지각 1")).toHaveClass("text-pink-600");
    const roleCard = within(summary).getByRole("link", {
      name: "직군별 인원배정 경비원 2명 미화원 1명 파견 1명",
    });
    expect(roleCard).toHaveAttribute("href", "/manager/employee/employees");
    expect(within(roleCard).getByText("경비원 2명")).toBeInTheDocument();
    expect(within(roleCard).getByText("미화원 1명")).toBeInTheDocument();
    expect(within(roleCard).getByText("파견 1명")).toBeInTheDocument();

    const educationCard = within(summary).getByRole("link", {
      name: "안전교육 이수율 80% 안전교육 미이수 3명",
    });
    expect(educationCard).toHaveAttribute("href", "/manager/safety/completions");
    expect(within(educationCard).getByText("안전교육 이수율")).toBeInTheDocument();
    expect(within(educationCard).getByText("80%")).toBeInTheDocument();
    expect(within(educationCard).getByText("안전교육 미이수 3명")).toBeInTheDocument();

    const remarksCard = within(summary).getByRole("link", {
      name: "미처리 특이사항 4건 긴급 조치 요구됨",
    });
    expect(remarksCard).toHaveAttribute("href", "/manager/inspection/special-remarks");
    expect(within(remarksCard).getByText("미처리 특이사항")).toBeInTheDocument();
    expect(within(remarksCard).getByText("4건")).toBeInTheDocument();
    expect(within(remarksCard).getByText("긴급 조치 요구됨")).toBeInTheDocument();

    expect(screen.queryByRole("heading", { name: "최근 30일 운영 추이" })).not.toBeInTheDocument();

    const attendanceSection = screen.getByRole("region", { name: "근태현황" });
    expect(within(attendanceSection).getByRole("columnheader", { name: "근무지" })).toBeInTheDocument();
    expect(within(attendanceSection).getByRole("columnheader", { name: "근무자" })).toBeInTheDocument();
    expect(within(attendanceSection).getByRole("columnheader", { name: "출근예정" })).toBeInTheDocument();
    expect(within(attendanceSection).getByRole("columnheader", { name: "출근일시" })).toBeInTheDocument();
    expect(within(attendanceSection).getByRole("columnheader", { name: "상태" })).toBeInTheDocument();
    expect(within(attendanceSection).getByRole("link", { name: "문현동현장" })).toHaveAttribute(
      "href",
      "/manager/reports/attendance",
    );
    expect(within(attendanceSection).getByText("김철수")).toBeInTheDocument();
    expect(within(attendanceSection).getByText("09:00")).toBeInTheDocument();
    expect(within(attendanceSection).getByText("2026-06-04 09:01")).toBeInTheDocument();
    expect(within(attendanceSection).getByText("지각")).toBeInTheDocument();

    const leaveSection = screen.getByRole("region", { name: "금주 휴가현황" });
    expect(within(leaveSection).getByRole("columnheader", { name: "이름" })).toBeInTheDocument();
    expect(within(leaveSection).getByRole("columnheader", { name: "직군" })).toBeInTheDocument();
    expect(within(leaveSection).getByRole("columnheader", { name: "근무형태" })).toBeInTheDocument();
    expect(within(leaveSection).getByRole("columnheader", { name: "휴가종류" })).toBeInTheDocument();
    expect(within(leaveSection).getByRole("columnheader", { name: "휴가기간" })).toBeInTheDocument();
    expect(within(leaveSection).getByRole("columnheader", { name: "근무지" })).toBeInTheDocument();
    expect(within(leaveSection).getByRole("columnheader", { name: "배정기간" })).toBeInTheDocument();
    expect(within(leaveSection).getByRole("link", { name: "김철수" })).toHaveAttribute("href", "/manager/leave");
    expect(within(leaveSection).getByText("연차")).toBeInTheDocument();
    expect(within(leaveSection).getByText("2026-06-01 ~ 2026-06-02")).toBeInTheDocument();
    expect(within(leaveSection).getByText("2026-01-01 ~ 2026-12-31")).toBeInTheDocument();

    const assignmentSection = screen.getByRole("region", { name: "현장 실시간 관제" });
    expect(within(assignmentSection).queryByRole("columnheader", { name: "직군" })).not.toBeInTheDocument();
    expect(within(assignmentSection).getByRole("columnheader", { name: "근무지명" })).toBeInTheDocument();
    expect(within(assignmentSection).getByRole("columnheader", { name: "출근인원" })).toBeInTheDocument();
    expect(within(assignmentSection).getByRole("columnheader", { name: "진행률" })).toBeInTheDocument();
    const assignmentRows = within(assignmentSection).getAllByRole("row");
    expect(assignmentRows).toHaveLength(2);
    const worksiteLink = within(assignmentRows[1]).getByRole("link", { name: "문현동현장" });
    expect(worksiteLink).toHaveAttribute("href", "/manager/inspection/sites");
    expect(within(assignmentRows[1]).queryByText("경비원")).not.toBeInTheDocument();
    expect(within(assignmentRows[1]).queryByText("미화원")).not.toBeInTheDocument();
    expect(within(assignmentRows[1]).getByText("1/3")).toBeInTheDocument();
    expect(within(assignmentRows[1]).getByText("50%")).toBeInTheDocument();

    expect(screen.queryByRole("region", { name: "실시간출근현황 리스트" })).not.toBeInTheDocument();
    const feedSection = screen.getByRole("region", { name: "실시간 특이사항 및 긴급피드" });
    expect(within(feedSection).getByRole("heading", { name: "실시간 특이사항 및 긴급피드" })).toBeInTheDocument();
    const feedItems = within(feedSection).getAllByRole("link");
    expect(feedItems).toHaveLength(2);
    expect(feedItems[0]).toHaveAttribute("href", "/manager/inspection/special-remarks/remark-1");
    expect(feedItems[0]).toHaveTextContent("[청소 | 문현동현장] 10:42");
    expect(feedItems[0]).toHaveTextContent('"세면대 배수구 막힘 및 누수 발생"');
    expect(feedItems[1]).toHaveTextContent("[시설 | 센텀현장] 10:15");
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
          summary: { ...dashboardPayload.summary, educationRate: 0 },
          specialRemarkFeed: [],
          worksiteMonitoring: [],
        }),
      ),
    );

    render(<ManagerPage />);

    expect(await screen.findByText("안전교육 이수율")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "운영 요약" })).getByText("0%")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "최근 30일 운영 추이" })).not.toBeInTheDocument();
    expect(screen.getByText("등록된 인원 배정이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("현재 미처리 특이사항이 없습니다.")).toBeInTheDocument();
  });
});

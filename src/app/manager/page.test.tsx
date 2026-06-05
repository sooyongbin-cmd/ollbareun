import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerPage from "./page";

const dashboardPayload = {
  summary: {
    totalEmployees: 12,
    currentlyClockedIn: 7,
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

  it("renders summary, daily charts, and live attendance list", async () => {
    render(<ManagerPage />);

    expect(await screen.findByRole("heading", { name: "관리자 대시보드" })).toBeInTheDocument();
    expect(screen.getByText("전체인원 12명 현재출근 7명 교육미이수 3명")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "출근율 일별 차트" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "안전교육 이수율 일별 차트" })).toBeInTheDocument();

    const assignmentSection = screen.getByRole("region", { name: "현장별 인원 배치" });
    expect(within(assignmentSection).getByRole("heading", { name: "현장별 인원 배치" })).toBeInTheDocument();
    expect(within(assignmentSection).getByRole("columnheader", { name: "근무지명" })).toBeInTheDocument();
    expect(within(assignmentSection).getByRole("columnheader", { name: "배정인원수" })).toBeInTheDocument();
    expect(within(assignmentSection).getByText("문현동현장")).toBeInTheDocument();
    expect(within(assignmentSection).getByText("센텀현장")).toBeInTheDocument();
    expect(within(assignmentSection).getByRole("link", { name: "2" })).toHaveAttribute(
      "href",
      "/manager/employee/assignments?worksite=%EB%AC%B8%ED%98%84%EB%8F%99%ED%98%84%EC%9E%A5",
    );
    expect(within(assignmentSection).getByText("0")).toBeInTheDocument();

    const liveSection = screen.getByRole("region", { name: "실시간출근현황 리스트" });
    expect(within(liveSection).getByRole("columnheader", { name: "성명" })).toBeInTheDocument();
    expect(within(liveSection).getByRole("columnheader", { name: "현장명" })).toBeInTheDocument();
    expect(within(liveSection).getByRole("columnheader", { name: "출근시간" })).toBeInTheDocument();
    expect(within(liveSection).getByRole("columnheader", { name: "교육여부" })).toBeInTheDocument();
    expect(within(liveSection).getByRole("columnheader", { name: "출근상태" })).toBeInTheDocument();
    expect(within(liveSection).getByText("김철수")).toBeInTheDocument();
  });
});

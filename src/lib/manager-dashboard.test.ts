import { describe, expect, it } from "vitest";
import { buildManagerDashboardData } from "./manager-dashboard";

describe("manager dashboard data", () => {
  it("counts active employees, current clock-ins, and education-uncompleted employees", () => {
    const data = buildManagerDashboardData({
      now: new Date("2026-06-04T03:00:00.000Z"),
      employees: [
        { id: "emp-1", name: "김철수", is_retired: false },
        { id: "emp-2", name: "이영희", is_retired: false },
        { id: "emp-3", name: "퇴직자", is_retired: true },
      ],
      worksites: [{ id: "work-1", name: "문현동현장" }],
      assignments: [
        { employee_id: "emp-1", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
        { employee_id: "emp-2", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
      ],
      attendance: [
        {
          employee_id: "emp-1",
          worksite_id: "work-1",
          work_date: "2026-06-04",
          clock_in_at: "2026-06-04T00:00:00.000Z",
          clock_out_at: null,
        },
        {
          employee_id: "emp-2",
          worksite_id: "work-1",
          work_date: "2026-06-04",
          clock_in_at: "2026-06-04T01:00:00.000Z",
          clock_out_at: "2026-06-04T02:00:00.000Z",
        },
      ],
      educationResources: [{ id: "res-1" }, { id: "res-2" }],
      educationCompletions: [
        { employee_id: "emp-1", resource_id: "res-1", is_completed: true, completed_at: "2026-06-01T00:00:00.000Z" },
        { employee_id: "emp-1", resource_id: "res-2", is_completed: true, completed_at: "2026-06-02T00:00:00.000Z" },
        { employee_id: "emp-2", resource_id: "res-1", is_completed: true, completed_at: "2026-06-03T00:00:00.000Z" },
      ],
    });

    expect(data.summary).toEqual({
      totalEmployees: 2,
      currentlyClockedIn: 1,
      educationUncompleted: 1,
    });
    expect(data.liveAttendance).toHaveLength(2);
    expect(data.liveAttendance).toContainEqual({
      employeeName: "김철수",
      worksiteName: "문현동현장",
      clockInAt: "2026-06-04T00:00:00.000Z",
      educationStatus: "완료",
      attendanceStatus: "출근",
    });
    expect(data.liveAttendance).toContainEqual({
      employeeName: "이영희",
      worksiteName: "문현동현장",
      clockInAt: "2026-06-04T01:00:00.000Z",
      educationStatus: "미이수",
      attendanceStatus: "퇴근",
    });
  });

  it("returns recent 30 day chart rates with zero-safe division", () => {
    const data = buildManagerDashboardData({
      now: new Date("2026-06-04T03:00:00.000Z"),
      employees: [],
      worksites: [],
      assignments: [],
      attendance: [{ employee_id: "emp-1", worksite_id: "work-1", work_date: "2026-06-04", clock_in_at: "x", clock_out_at: null }],
      educationResources: [{ id: "res-1" }],
      educationCompletions: [{ employee_id: "emp-1", resource_id: "res-1", is_completed: true, completed_at: "2026-06-04T00:00:00.000Z" }],
    });

    expect(data.dailyRates).toHaveLength(30);
    expect(data.dailyRates[0].date).toBe("2026-05-06");
    expect(data.dailyRates[29]).toEqual({
      date: "2026-06-04",
      attendanceRate: 0,
      educationRate: 0,
    });
  });

  it("counts current assignment totals by worksite and includes empty worksites", () => {
    const data = buildManagerDashboardData({
      now: new Date("2026-06-04T03:00:00.000Z"),
      employees: [
        { id: "emp-1", name: "김철수", is_retired: false },
        { id: "emp-2", name: "이영희", is_retired: false },
        { id: "emp-3", name: "박민수", is_retired: false },
      ],
      worksites: [
        { id: "work-1", name: "문현동현장" },
        { id: "work-2", name: "센텀현장" },
        { id: "work-3", name: "배정없음" },
      ],
      assignments: [
        { employee_id: "emp-1", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
        { employee_id: "emp-2", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
        { employee_id: "emp-3", worksite_id: "work-2", start_date: "2026-01-01", end_date: "2026-12-31" },
        { employee_id: "emp-3", worksite_id: "work-1", start_date: "2026-05-01", end_date: "2026-05-31" },
      ],
      attendance: [],
      educationResources: [],
      educationCompletions: [],
    });

    expect(data.worksiteAssignments).toEqual([
      { worksiteId: "work-1", worksiteName: "문현동현장", assignedCount: 2 },
      { worksiteId: "work-2", worksiteName: "센텀현장", assignedCount: 1 },
      { worksiteId: "work-3", worksiteName: "배정없음", assignedCount: 0 },
    ]);
  });
});

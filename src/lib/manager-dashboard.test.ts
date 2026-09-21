import { describe, expect, it } from "vitest";
import { buildManagerDashboardData } from "./manager-dashboard";

describe("manager dashboard data", () => {
  it("counts active employees, current clock-ins, and education-uncompleted employees", () => {
    const data = buildManagerDashboardData({
      now: new Date("2026-06-04T03:00:00.000Z"),
      employees: [
        { id: "emp-1", name: "김철수", role: "경비원", is_retired: false },
        { id: "emp-2", name: "이영희", role: "미화원", is_retired: false },
        { id: "emp-3", name: "퇴직자", role: "파견", is_retired: true },
      ],
      worksites: [{ id: "work-1", name: "문현동현장" }],
      assignments: [
        { id: "assign-1", employee_id: "emp-1", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
        { id: "assign-2", employee_id: "emp-2", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
      ],
      attendance: [
        {
          employee_id: "emp-1",
          worksite_id: "work-1",
          work_date: "2026-06-04",
          intime_status: "2",
          work_intime: "2026-06-04T00:00:00.000Z",
          work_outtime: null,
        },
        {
          employee_id: "emp-2",
          worksite_id: "work-1",
          work_date: "2026-06-04",
          intime_status: "3",
          work_intime: "2026-06-04T01:00:00.000Z",
          work_outtime: "2026-06-04T02:00:00.000Z",
        },
      ],
      dailyAttendance: [
        { id: "record-1", employee_id: "emp-1", worksite_id: "work-1", work_date: "2026-06-04", intime: "2026-06-04T00:00:00.000Z" },
        { id: "record-2", employee_id: "emp-2", worksite_id: "work-1", work_date: "2026-06-04", intime: null },
      ],
      educationResources: [{ id: "res-1" }, { id: "res-2" }],
      educationCompletions: [
        { employee_id: "emp-1", resource_id: "res-1", is_completed: true, completed_at: "2026-06-01T00:00:00.000Z" },
        { employee_id: "emp-1", resource_id: "res-2", is_completed: true, completed_at: "2026-06-02T00:00:00.000Z" },
        { employee_id: "emp-2", resource_id: "res-1", is_completed: true, completed_at: "2026-06-03T00:00:00.000Z" },
      ],
      inspectionSites: [
        { id: "site-1", worksite_id: "work-1" },
        { id: "site-2", worksite_id: "work-1" },
      ],
      inspectionLogs: [
        { inspection_site_id: "site-1", worksite_id: "work-1" },
        { inspection_site_id: "site-1", worksite_id: "work-1" },
      ],
      specialRemarkReports: [
        { processing_status: "N" },
        { processing_status: "Y" },
      ],
    });

    expect(data.summary).toEqual({
      scheduledEmployeesToday: 1,
      currentlyClockedIn: 1,
      onTimeEmployeesToday: 2,
      waitingEmployeesToday: 0,
      absentEmployeesToday: 0,
      lateEmployeesToday: 0,
      educationUncompleted: 1,
      educationRate: 50,
      employeeRoleCounts: {
        guard: 1,
        cleaner: 1,
        dispatched: 0,
      },
      unprocessedSpecialRemarks: 1,
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
    expect(data.worksiteMonitoring).toEqual([
      {
        worksiteId: "work-1",
        employeeRole: "경비원",
        worksiteName: "문현동현장",
        attendanceCount: 1,
        assignedCount: 1,
        inspectedSiteCount: 1,
        inspectionSiteCount: 2,
      },
      {
        worksiteId: "work-1",
        employeeRole: "미화원",
        worksiteName: "문현동현장",
        attendanceCount: 1,
        assignedCount: 1,
        inspectedSiteCount: 1,
        inspectionSiteCount: 2,
      },
    ]);
  });

  it("counts waiting, absent, and late employees separately", () => {
    const data = buildManagerDashboardData({
      now: new Date("2026-06-04T03:00:00.000Z"),
      employees: [
        { id: "emp-1", name: "김철수", is_retired: false },
        { id: "emp-2", name: "이영희", is_retired: false },
        { id: "emp-3", name: "박민수", is_retired: false },
        { id: "emp-4", name: "최민수", is_retired: false },
      ],
      worksites: [{ id: "work-1", name: "문현동현장" }],
      assignments: [
        { id: "assign-1", employee_id: "emp-1", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
        { id: "assign-2", employee_id: "emp-2", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
        { id: "assign-3", employee_id: "emp-3", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
        { id: "assign-4", employee_id: "emp-4", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
      ],
      attendance: [
        {
          employee_id: "emp-1",
          worksite_id: "work-1",
          work_date: "2026-06-04",
          intime_status: "2",
          work_intime: "2026-06-04T00:00:00.000Z",
          work_outtime: null,
        },
        {
          employee_id: "emp-2",
          worksite_id: "work-1",
          work_date: "2026-06-04",
          intime_status: "1",
          work_intime: "2026-06-04T01:05:00.000Z",
          work_outtime: null,
        },
        {
          employee_id: "emp-3",
          worksite_id: "work-1",
          work_date: "2026-06-04",
          intime_status: "0",
          work_intime: null,
          work_outtime: null,
        },
        {
          employee_id: "emp-4",
          worksite_id: "work-1",
          work_date: "2026-06-04",
          intime_status: "3",
          work_intime: "2026-06-04T02:00:00.000Z",
          work_outtime: "2026-06-04T03:00:00.000Z",
        },
      ],
      dailyAttendance: [
        { id: "record-1", employee_id: "emp-1", worksite_id: "work-1", work_date: "2026-06-04", intime: "2026-06-04T00:00:00.000Z" },
        { id: "record-2", employee_id: "emp-2", worksite_id: "work-1", work_date: "2026-06-04", intime: "2026-06-04T01:00:00.000Z" },
        { id: "record-3", employee_id: "emp-3", worksite_id: "work-1", work_date: "2026-06-04", intime: "2026-06-04T02:00:00.000Z" },
        { id: "record-4", employee_id: "emp-4", worksite_id: "work-1", work_date: "2026-06-04", intime: "2026-06-04T04:00:00.000Z" },
      ],
      educationResources: [],
      educationCompletions: [],
    });

    expect(data.summary).toMatchObject({
      scheduledEmployeesToday: 4,
      currentlyClockedIn: 2,
      onTimeEmployeesToday: 2,
      waitingEmployeesToday: 0,
      absentEmployeesToday: 1,
      lateEmployeesToday: 1,
    });
  });

  it("counts waiting records using the same status rule as the attendance status report", () => {
    const data = buildManagerDashboardData({
      now: new Date("2026-06-04T00:30:00.000Z"),
      employees: [{ id: "emp-1", name: "김철수", is_retired: false }],
      worksites: [{ id: "work-1", name: "문현동현장" }],
      assignments: [],
      attendance: [{
        employee_id: "emp-1",
        worksite_id: "work-1",
        work_date: "2026-06-04",
        intime: "2026-06-04T01:00:00.000Z",
        intime_status: "0",
        work_intime: null,
        work_outtime: null,
      }],
      dailyAttendance: [{
        employee_id: "emp-1",
        worksite_id: "work-1",
        work_date: "2026-06-04",
        intime: "2026-06-04T01:00:00.000Z",
      }],
      educationResources: [],
      educationCompletions: [],
    });

    expect(data.summary).toMatchObject({
      onTimeEmployeesToday: 0,
      waitingEmployeesToday: 1,
      absentEmployeesToday: 0,
      lateEmployeesToday: 0,
    });
  });

  it("groups current assignments by role and worksite", () => {
    const data = buildManagerDashboardData({
      now: new Date("2026-06-04T03:00:00.000Z"),
      employees: [
        { id: "emp-1", name: "김철수", role: "경비원", is_retired: false },
        { id: "emp-2", name: "이영희", role: "미화원", is_retired: false },
        { id: "emp-3", name: "박민수", role: "파견", is_retired: false },
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
      attendance: [{
        employee_id: "emp-1",
        worksite_id: "work-1",
        work_date: "2026-06-04",
        intime: null,
        intime_status: "2",
        work_intime: "2026-06-04T00:00:00.000Z",
        work_outtime: null,
      }],
      dailyAttendance: [],
      educationResources: [],
      educationCompletions: [],
      inspectionSites: [
        { id: "site-1", worksite_id: "work-1" },
        { id: "site-2", worksite_id: "work-1" },
        { id: "site-3", worksite_id: "work-2" },
      ],
      inspectionLogs: [
        { inspection_site_id: "site-1", worksite_id: "work-1" },
        { inspection_site_id: "site-1", worksite_id: "work-1" },
        { inspection_site_id: "site-3", worksite_id: "work-2" },
      ],
    });

    expect(data.worksiteMonitoring).toEqual([
      {
        worksiteId: "work-1",
        employeeRole: "경비원",
        worksiteName: "문현동현장",
        attendanceCount: 1,
        assignedCount: 1,
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
      {
        worksiteId: "work-2",
        employeeRole: "파견",
        worksiteName: "센텀현장",
        attendanceCount: 0,
        assignedCount: 1,
        inspectedSiteCount: 1,
        inspectionSiteCount: 1,
      },
    ]);
  });

  it("excludes today's days off from worksite assignment totals", () => {
    const data = buildManagerDashboardData({
      now: new Date("2026-06-04T03:00:00.000Z"),
      employees: [
        { id: "emp-1", name: "김철수", role: "경비원", is_retired: false },
        { id: "emp-2", name: "이영희", role: "미화원", is_retired: false },
      ],
      worksites: [{ id: "work-1", name: "문현동현장" }],
      assignments: [
        { id: "assign-1", employee_id: "emp-1", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
        { id: "assign-2", employee_id: "emp-2", worksite_id: "work-1", start_date: "2026-01-01", end_date: "2026-12-31" },
      ],
      attendance: [],
      educationResources: [],
      educationCompletions: [],
      dailyAttendance: [],
      daysOff: [{ work_assignment_id: "assign-2", day_off_date: "2026-06-04" }],
    });

    expect(data.worksiteMonitoring).toEqual([
      {
        worksiteId: "work-1",
        employeeRole: "경비원",
        worksiteName: "문현동현장",
        attendanceCount: 0,
        assignedCount: 1,
        inspectedSiteCount: 0,
        inspectionSiteCount: 0,
      },
    ]);
  });
});

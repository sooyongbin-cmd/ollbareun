import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import * as supabaseAdmin from "./supabase-admin";
import { buildManagerDashboardData, loadManagerDashboardData } from "./manager-dashboard";
import { buildAttendanceReport } from "./manager-reports";

describe("manager dashboard data", () => {
  it("matches report absences when an overnight worker also has a waiting shift", () => {
    const now = new Date("2026-09-29T11:00:00+09:00");
    const employees = Array.from({ length: 6 }, (_, index) => ({
      id: `employee-${index}`, name: `직원 ${index}`, is_retired: false,
    }));
    const attendance = [
      { id: "previous-night", employee_id: "employee-0", work_date: "2026-09-28", intime: "2026-09-28T22:00:00+09:00", outtime: "2026-09-29T06:00:00+09:00" },
      ...[1, 2, 3, 4].map((index) => ({
        id: `absent-${index}`, employee_id: `employee-${index}`, work_date: "2026-09-29", intime: "2026-09-29T07:00:00+09:00", outtime: "2026-09-29T18:00:00+09:00",
      })),
      { id: "next-night", employee_id: "employee-0", work_date: "2026-09-29", intime: "2026-09-29T22:00:00+09:00", outtime: "2026-09-30T06:00:00+09:00" },
      { id: "waiting-noon", employee_id: "employee-5", work_date: "2026-09-29", intime: "2026-09-29T12:00:00+09:00", outtime: "2026-09-29T17:00:00+09:00" },
    ].map((record) => ({
      ...record, worksite_id: "site-1", intime_status: "0" as const,
      outtime_status: "0" as const, work_intime: null, work_outtime: null,
    }));
    const { summary } = buildManagerDashboardData({
      now, employees, attendance, dailyAttendance: attendance,
      employeeRoles: [],
      worksites: [], assignments: [], educationResources: [], educationCompletions: [],
    });
    const rows = buildAttendanceReport({
      now, employeeName: "", workDate: "2026-09-29", employees,
      attendance, dailyAttendance: attendance,
    });

    expect(rows).toHaveLength(7);
    expect(rows.find((row) => row.id === "previous-night")?.status).toBe("결근");
    expect(rows.find((row) => row.id === "next-night")?.status).toBe("대기");
    expect(summary.absentEmployeesToday).toBe(5);
    expect(summary.waitingEmployeesToday).toBe(2);
    expect(summary.absentEmployeesToday).toBe(rows.filter((row) => row.status === "결근").length);
    expect(summary.waitingEmployeesToday).toBe(rows.filter((row) => row.status === "대기").length);
  });

  it.each([
    { name: "대기는 퇴근상태가 있어도 제외", intime: "2026-06-04T12:01:00+09:00", inStatus: "0", outStatus: "2", counts: [1, 0, 0, 0, 0, 0, 0] },
    { name: "출근예정 이전은 상태코드와 무관하게 대기", intime: "2026-06-04T12:01:00+09:00", inStatus: "2", outStatus: "1", counts: [1, 0, 0, 0, 0, 0, 0] },
    { name: "출근예정시각부터 결근이며 퇴근은 제외", intime: "2026-06-04T12:00:00+09:00", inStatus: "0", outStatus: "2", counts: [0, 0, 0, 1, 0, 0, 0] },
    { name: "결근은 조퇴도 제외", inStatus: "0", outStatus: "1", counts: [0, 0, 0, 1, 0, 0, 0] },
    { name: "결근은 미퇴근도 제외", inStatus: "0", outStatus: "0", counts: [0, 0, 0, 1, 0, 0, 0] },
    { name: "퇴근예정 전에는 미퇴근 제외", outtime: "2026-06-04T12:01:00+09:00", inStatus: "2", outStatus: "0", counts: [0, 1, 0, 0, 0, 0, 0] },
    { name: "퇴근예정시각부터 미퇴근", inStatus: "2", outStatus: "0", counts: [0, 1, 0, 0, 0, 0, 1] },
    { name: "지각과 조퇴 상태코드 집계", outtime: "2026-06-04T18:00:00+09:00", inStatus: "1", outStatus: "1", counts: [0, 0, 1, 0, 0, 1, 0] },
    { name: "정상 퇴근 상태코드 집계", inStatus: "2", outStatus: "2", counts: [0, 1, 0, 0, 1, 0, 0] },
    { name: "전날 근무의 한국시간 오늘 자정 퇴근 포함", workDate: "2026-06-03", outtime: "2026-06-03T15:00:00Z", inStatus: "2", outStatus: "2", counts: [0, 1, 0, 0, 1, 0, 0] },
    { name: "오늘 자정 이전 퇴근 자료 제외", workDate: "2026-06-03", outtime: "2026-06-03T14:59:59Z", inStatus: "2", outStatus: "2", counts: [0, 0, 0, 0, 0, 0, 0] },
    { name: "내일 자정 퇴근 자료 제외", workDate: "2026-06-03", outtime: "2026-06-04T15:00:00Z", inStatus: "2", outStatus: "0", counts: [0, 0, 0, 0, 0, 0, 0] },
    { name: "오늘 근무는 내일 퇴근예정이어도 포함", outtime: "2026-06-04T15:00:00Z", inStatus: "2", outStatus: "0", counts: [0, 1, 0, 0, 0, 0, 0] },
  ])("$name", ({ intime, outtime, workDate, inStatus, outStatus, counts }) => {
    const { summary } = buildManagerDashboardData({
      now: new Date("2026-06-04T12:00:00+09:00"),
      employeeRoles: [],
      employees: [{ id: "emp-1", name: "직원" }],
      worksites: [], assignments: [], dailyAttendance: [], educationResources: [], educationCompletions: [],
      attendance: [{
        employee_id: "emp-1", worksite_id: "work-1", work_date: workDate ?? "2026-06-04",
        intime: intime ?? "2026-06-03T22:00:00+09:00", outtime: outtime ?? "2026-06-04T12:00:00+09:00",
        intime_status: inStatus as "0" | "1" | "2", outtime_status: outStatus as "0" | "1" | "2",
        work_intime: null, work_outtime: null,
      }],
    });
    expect([
      summary.waitingEmployeesToday, summary.onTimeEmployeesToday, summary.lateEmployeesToday,
      summary.absentEmployeesToday, summary.clockedOutEmployeesToday,
      summary.earlyLeaveEmployeesToday, summary.notClockedOutEmployeesToday,
    ]).toEqual(counts);
  });

  it("queries the union of today's work date and KST clock-out date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T15:30:00Z"));
    const queries: URL[] = [];
    const client = createClient("https://example.supabase.co", "test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async (url) => {
        const requestUrl = new URL(String(url));
        queries.push(requestUrl);
        return new Response(
          requestUrl.pathname.endsWith("/system_configs")
            ? JSON.stringify({ content: "경비원\n미화원\n파견" })
            : "[]",
          { headers: { "Content-Type": "application/json" } },
        );
      } },
    });
    const adminSpy = vi.spyOn(supabaseAdmin, "getSupabaseAdmin").mockReturnValue(client);
    try {
      await loadManagerDashboardData();
      const records = queries.filter((url) => url.pathname.endsWith("/work_record"));
      expect(records).toHaveLength(1);
      expect(records[0].searchParams.get("select")?.split(",")).toContain("outtime");
      expect(records[0].searchParams.get("or")).toBe(
        "(work_date.eq.2026-06-04,and(outtime.gte.2026-06-04T00:00:00+09:00,outtime.lt.2026-06-05T00:00:00+09:00))",
      );
      expect(records[0].searchParams.has("work_date")).toBe(false);
      expect(queries.some((url) => url.pathname.endsWith("/system_configs")
        && url.searchParams.get("system_code") === "eq.employees_role")).toBe(true);
    } finally {
      adminSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it("counts active employees, current clock-ins, and education-uncompleted employees", () => {
    const data = buildManagerDashboardData({
      now: new Date("2026-06-04T03:00:00.000Z"),
      employeeRoles: ["경비원", "미화원", "파견", "주차원"],
      employees: [
        { id: "emp-1", name: "김철수", role: "경비원", work_style: "0", is_retired: false },
        { id: "emp-2", name: "이영희", role: "미화원", work_style: "1", is_retired: false },
        { id: "emp-3", name: "퇴직자", role: "파견", work_style: "2", is_retired: true },
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
          outtime_status: "0",
          outtime: "2026-06-04T03:00:00.000Z",
          work_intime: "2026-06-04T00:00:00.000Z",
          work_outtime: null,
        },
        {
          employee_id: "emp-2",
          worksite_id: "work-1",
          work_date: "2026-06-04",
          intime_status: "2",
          outtime_status: "2",
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
        {
          id: "remark-1",
          employee_id: "emp-1",
          worksite_name: "문현동현장",
          content: "세면대 배수구 막힘",
          reported_at: "2026-06-04T01:42:00.000Z",
          processing_status: "N",
        },
        { processing_status: "Y" },
      ],
    });

    expect(data.summary).toEqual({
      totalEmployees: 2,
      scheduledEmployeesToday: 2,
      currentlyClockedIn: 1,
      attendanceRate: 100,
      onTimeEmployeesToday: 2,
      clockedOutEmployeesToday: 1,
      earlyLeaveEmployeesToday: 0,
      notClockedOutEmployeesToday: 1,
      waitingEmployeesToday: 0,
      absentEmployeesToday: 0,
      lateEmployeesToday: 0,
      educationUncompleted: 1,
      educationRate: 50,
      employeeRoleCounts: [
        { role: "경비원", count: 1 },
        { role: "미화원", count: 1 },
        { role: "파견", count: 0 },
        { role: "주차원", count: 0 },
      ],
      workStyleCounts: { "0": 1, "1": 1, "2": 0 },
      unprocessedSpecialRemarks: 1,
    });
    expect(data.specialRemarkFeed).toEqual([
      {
        id: "remark-1",
        category: "시설",
        worksiteName: "문현동현장",
        reportedAt: "2026-06-04T01:42:00.000Z",
        content: "세면대 배수구 막힘",
      },
    ]);
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
      employeeRoles: ["경비원", "미화원", "파견"],
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
          intime_status: "2",
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
      onTimeEmployeesToday: 1,
      waitingEmployeesToday: 1,
      absentEmployeesToday: 1,
      lateEmployeesToday: 1,
    });
  });

  it("counts waiting records using the same status rule as the attendance status report", () => {
    const data = buildManagerDashboardData({
      now: new Date("2026-06-04T00:30:00.000Z"),
      employeeRoles: ["경비원", "미화원", "파견"],
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
      employeeRoles: ["경비원", "미화원", "파견"],
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
      employeeRoles: ["경비원", "미화원", "파견"],
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

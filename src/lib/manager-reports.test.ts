import { describe, expect, it, vi } from "vitest";
import { buildAttendanceReport, buildEducationReport, loadAttendanceReport, updateAttendanceRecord } from "./manager-reports";
import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";

vi.mock("./supabase", () => ({
  getSupabase: vi.fn(),
}));

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("manager reports", () => {
  it("does not update clock-out when it is omitted", async () => {
    const existingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "attendance-1", intime: null, outtime: null, work_intime: "2026-09-09T00:00:00.000Z", work_outtime: null }, error: null }),
    };
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
      }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValueOnce(existingQuery).mockReturnValueOnce({ update }) } as never);
    await updateAttendanceRecord({ recordId: "attendance-1", clockInDateTime: "2026-09-09T09:00", clockOutDateTime: undefined });
    expect(update.mock.calls[0][0]).not.toHaveProperty("work_outtime");
  });

  it("filters attendance by employee name and work date and formats duration", () => {
    const rows = buildAttendanceReport({
      employeeName: "김철수",
      workDate: "2026-03-02",
      worksites: [{ id: "site-1", name: "본사" }],
      employees: [
        { id: "emp-1", name: "김철수", work_style: "0" },
        { id: "emp-2", name: "이영희" },
      ],
      attendance: [
        {
          id: "attendance-1",
          worksite_id: "site-1",
          employee_id: "emp-1",
          work_date: "2026-03-02",
          intime: "2026-03-02T00:00:00.000Z",
          outtime: "2026-03-02T09:00:00.000Z",
          work_intime: "2026-03-02T00:00:00.000Z",
          work_outtime: "2026-03-02T09:30:00.000Z",
          intime_status: "2",
          outtime_status: "2",
        },
        {
          id: "attendance-2",
          employee_id: "emp-2",
          work_date: "2026-03-02",
          work_intime: "2026-03-02T00:00:00.000Z",
          work_outtime: null,
        },
        {
          id: "attendance-3",
          employee_id: "emp-1",
          work_date: "2025-03-02",
          work_intime: "2025-03-02T00:00:00.000Z",
          work_outtime: null,
        },
      ],
      assignments: [{ id: "assignment-1", employee_id: "emp-1", worksite_id: "site-1" }],
      dailyAttendance: [{ id: "attendance-1", employee_id: "emp-1", worksite_id: "site-1", work_date: "2026-03-02", intime: "2026-03-02T00:00:00.000Z", outtime: "2026-03-02T09:00:00.000Z" }],
    });

    expect(rows).toEqual([
      {
        id: "attendance-1",
        workDate: "2026-03-02",
        employeeName: "김철수",
        workStyle: "일반근무",
        worksiteName: "본사",
        scheduledClockIn: "09:00",
        scheduledClockOut: "2026-03-02 18:00",
        clockInDateTime: "2026-03-02 09:00",
        clockOutDateTime: "2026-03-02 18:30",
        workDuration: "9시간 30분",
        intimeStatus: "2",
        status: "출근",
        outtimeStatus: "2",
        outtimeLabel: "퇴근",
        isLate: false,
      },
    ]);
  });

  it("marks attendance as late when clock-in is after the assigned daily start time", () => {
    const rows = buildAttendanceReport({
      employeeName: "김철수",
      workDate: "2026-03-02",
      employees: [{ id: "emp-1", name: "김철수" }],
      worksites: [{ id: "site-1", name: "본사" }],
      assignments: [{ id: "assignment-1", employee_id: "emp-1", worksite_id: "site-1" }],
      dailyAttendance: [
        { id: "late-attendance", employee_id: "emp-1", worksite_id: "site-1", work_date: "2026-03-02", intime: "2026-03-02T00:00:00.000Z" },
        { id: "on-time-attendance", employee_id: "emp-1", worksite_id: "site-1", work_date: "2026-03-03", intime: "2026-03-03T00:00:00.000Z" },
      ],
      attendance: [
        {
          id: "late-attendance",
          worksite_id: "site-1",
          employee_id: "emp-1",
          work_date: "2026-03-02",
          work_intime: "2026-03-02T00:01:00.000Z",
          work_outtime: null,
          intime_status: "1",
        },
        {
          id: "on-time-attendance",
          worksite_id: "site-1",
          employee_id: "emp-1",
          work_date: "2026-03-03",
          work_intime: "2026-03-03T00:00:00.000Z",
          work_outtime: null,
          intime_status: "2",
        },
      ],
    });

    expect(rows.map((row) => ({ id: row.id, isLate: row.isLate, intimeStatus: row.intimeStatus }))).toEqual([
      { id: "late-attendance", isLate: true, intimeStatus: "1" },
    ]);
  });

  it("includes scheduled times and absence status for the selected work date", () => {
    const rows = buildAttendanceReport({
      employeeName: "",
      workDate: "2026-09-17",
      employees: [{ id: "emp-1", name: "김철수", work_style: "2" }],
      worksites: [{ id: "site-1", name: "본사" }],
      now: new Date("2026-09-16T12:00:00.000Z"),
      attendance: [{
        id: "absence-1",
        employee_id: "emp-1",
        worksite_id: "site-1",
        work_date: "2026-09-17",
        intime: "2026-09-16T13:00:00.000Z",
        outtime: "2026-09-17T21:00:00.000Z",
        work_intime: null,
        work_outtime: null,
        intime_status: "0",
      }],
    });

    expect(rows).toEqual([expect.objectContaining({
      employeeName: "김철수",
      workStyle: "야간근무",
      scheduledClockIn: "22:00",
      scheduledClockOut: "2026-09-18 06:00",
      clockInDateTime: "-",
      clockOutDateTime: null,
      intimeStatus: "0",
      status: "대기",
      isLate: false,
    })]);
  });

  it("loads the attendance report through the admin client so RLS does not hide manager data", async () => {
    const employeesQuery = { select: vi.fn(), ilike: vi.fn() };
    employeesQuery.select.mockReturnValue(employeesQuery);
    employeesQuery.ilike.mockResolvedValue({ data: [{ id: "emp-1", name: "김철수" }], error: null });

    const attendanceQuery = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
    attendanceQuery.select.mockReturnValue(attendanceQuery);
    attendanceQuery.eq.mockReturnValue(attendanceQuery);
    attendanceQuery.order.mockResolvedValue({
      data: [{
        id: "attendance-1",
        employee_id: "emp-1",
        worksite_id: "site-1",
        work_date: "2026-09-17",
        work_intime: "2026-09-17T00:00:00.000Z",
        work_outtime: null,
      }],
      error: null,
    });

    const worksitesQuery = { select: vi.fn() };
    worksitesQuery.select.mockResolvedValue({ data: [{ id: "site-1", name: "본사" }], error: null });

    const assignmentsQuery = { select: vi.fn() };
    assignmentsQuery.select.mockResolvedValue({ data: [{ id: "assignment-1", employee_id: "emp-1", worksite_id: "site-1" }], error: null });

    const from = vi.fn((table: string) => ({
      employees: employeesQuery,
      work_record: attendanceQuery,
      worksites: worksitesQuery,
      work_assignments: assignmentsQuery,
    })[table]);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    vi.mocked(getSupabase).mockClear();

    await expect(loadAttendanceReport({ employeeName: "", workDate: "2026-09-17" })).resolves.toEqual([
      expect.objectContaining({ id: "attendance-1", employeeName: "김철수", worksiteName: "본사" }),
    ]);
    expect(getSupabase).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("employees");
    expect(from).toHaveBeenCalledWith("work_record");
    expect(attendanceQuery.eq).toHaveBeenCalledWith("work_date", "2026-09-17");
  });

  it("computes education completion count per active employee", () => {
    const rows = buildEducationReport({
      year: "2026",
      employees: [
        { id: "emp-1", name: "김철수", is_retired: false },
        { id: "emp-2", name: "이영희", is_retired: false },
        { id: "emp-3", name: "퇴직자", is_retired: true },
      ],
      resources: [{ id: "res-1" }, { id: "res-2" }],
      completions: [
        { employee_id: "emp-1", resource_id: "res-1", is_completed: true, completed_at: "2026-01-02T00:00:00.000Z" },
        { employee_id: "emp-1", resource_id: "res-2", is_completed: true, completed_at: "2025-01-02T00:00:00.000Z" },
        { employee_id: "emp-2", resource_id: "res-1", is_completed: false, completed_at: null },
      ],
    });

    expect(rows).toEqual([
      { employeeName: "김철수", completedCount: 1, totalCount: 2 },
      { employeeName: "이영희", completedCount: 0, totalCount: 2 },
    ]);
  });

  it("stores manager-entered KST clock-in and clock-out date-time values", async () => {
    const existingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "attendance-1", intime: null, outtime: null, work_intime: null, work_outtime: null }, error: null }),
    };
    const updateSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attendance-1",
        work_date: "2026-06-04",
        work_intime: "2026-06-03T23:30:00.000Z",
        work_outtime: "2026-06-04T10:00:00.000Z",
      },
      error: null,
    });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: updateSingle }),
      }),
    });
    const from = vi.fn().mockReturnValueOnce(existingQuery).mockReturnValueOnce({ update });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    await expect(
      updateAttendanceRecord({
        recordId: "attendance-1",
        clockInDateTime: "2026-06-04T08:30",
        clockOutDateTime: "2026-06-04T19:00",
      }),
    ).resolves.toEqual({
      id: "attendance-1",
      work_date: "2026-06-04",
      work_intime: "2026-06-03T23:30:00.000Z",
      work_outtime: "2026-06-04T10:00:00.000Z",
    });

    expect(update).toHaveBeenCalledWith({
      work_date: "2026-06-04",
      work_intime: "2026-06-03T23:30:00.000Z",
      work_outtime: "2026-06-04T10:00:00.000Z",
      intime_status: "2",
      outtime_status: "2",
      updated_at: expect.any(String),
    });
  });

  it("does not clear an existing clock-out when no clock-out value is entered", async () => {
    const existingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "attendance-1", intime: null, outtime: null, work_intime: "2026-06-04T00:00:00.000Z", work_outtime: "2026-06-04T10:00:00.000Z" }, error: null }),
    };
    const updateSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attendance-1",
        work_date: "2026-06-04",
        work_intime: "2026-06-04T00:00:00.000Z",
        work_outtime: null,
      },
      error: null,
    });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: updateSingle }),
      }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValueOnce(existingQuery).mockReturnValueOnce({ update }) } as never);

    await updateAttendanceRecord({
      recordId: "attendance-1",
      clockInDateTime: "2026-06-04T09:00",
      clockOutDateTime: "",
    });

    expect(update).toHaveBeenCalledWith({
      work_date: "2026-06-04",
      work_intime: "2026-06-04T00:00:00.000Z",
      intime_status: "2",
      outtime_status: "2",
      updated_at: expect.any(String),
    });
  });

  it("updates only clock-out when clock-in input is empty", async () => {
    const existingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "attendance-1", intime: "2026-06-04T00:00:00.000Z", outtime: "2026-06-04T09:00:00.000Z", work_intime: "2026-06-04T00:00:00.000Z", work_outtime: null }, error: null }),
    };
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }) }) });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValueOnce(existingQuery).mockReturnValueOnce({ update }) } as never);
    await updateAttendanceRecord({ recordId: "attendance-1", clockInDateTime: "", clockOutDateTime: "2026-06-04T18:00" });
    expect(update).toHaveBeenCalledWith({ work_outtime: "2026-06-04T09:00:00.000Z", intime_status: "2", outtime_status: "2", updated_at: expect.any(String) });
  });

  it("rejects an invalid calendar date for attendance editing", async () => {
    await expect(
      updateAttendanceRecord({
        recordId: "attendance-1",
        clockInDateTime: "2026-02-31T09:00",
        clockOutDateTime: "",
      }),
    ).rejects.toThrow("출근일시를 올바르게 입력하세요.");
  });
});

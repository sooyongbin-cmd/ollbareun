import { describe, expect, it, vi } from "vitest";
import { buildAttendanceReport, buildAttendanceStatus, buildEducationReport, createAttendanceRecord, loadAttendanceStatus, updateAttendanceRecord } from "./manager-reports";
import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";

vi.mock("./supabase", () => ({
  getSupabase: vi.fn(),
}));

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("manager reports", () => {
  it("inserts a new attendance record in KST with optional clock-out", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "new-1" }, error: null });
    const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue({ insert }) } as never);
    await createAttendanceRecord({ employeeId: "emp-1", worksiteId: "site-1", clockInDateTime: "2026-09-09T09:00", clockOutDateTime: "" });
    expect(insert).toHaveBeenCalledWith({ employee_id: "emp-1", worksite_id: "site-1", work_date: "2026-09-09", clock_in_at: "2026-09-09T00:00:00.000Z", clock_out_at: null });
    single.mockResolvedValue({ data: null, error: { code: "23505" } } as never);
    await expect(createAttendanceRecord({ employeeId: "emp-1", worksiteId: "site-1", clockInDateTime: "2026-09-09T09:00", clockOutDateTime: "" })).rejects.toThrow("이미 있습니다");
    await expect(createAttendanceRecord({ employeeId: "emp-1", worksiteId: "site-1", clockInDateTime: "2026-09-09T09:00", clockOutDateTime: "2026-09-09T08:00" })).rejects.toThrow("이후여야");
  });

  it("does not update clock-out when it is omitted", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
      }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue({ update }) } as never);
    await updateAttendanceRecord({ recordId: "attendance-1", clockInDateTime: "2026-09-09T09:00", clockOutDateTime: undefined });
    expect(update.mock.calls[0][0]).not.toHaveProperty("clock_out_at");
  });

  it("filters attendance by employee name and year and formats duration", () => {
    const rows = buildAttendanceReport({
      employeeName: "김철수",
      year: "2026",
      worksites: [{ id: "site-1", name: "본사" }],
      employees: [
        { id: "emp-1", name: "김철수" },
        { id: "emp-2", name: "이영희" },
      ],
      attendance: [
        {
          id: "attendance-1",
          worksite_id: "site-1",
          employee_id: "emp-1",
          work_date: "2026-03-02",
          clock_in_at: "2026-03-02T00:00:00.000Z",
          clock_out_at: "2026-03-02T09:30:00.000Z",
        },
        {
          id: "attendance-2",
          employee_id: "emp-2",
          work_date: "2026-03-02",
          clock_in_at: "2026-03-02T00:00:00.000Z",
          clock_out_at: null,
        },
        {
          id: "attendance-3",
          employee_id: "emp-1",
          work_date: "2025-03-02",
          clock_in_at: "2025-03-02T00:00:00.000Z",
          clock_out_at: null,
        },
      ],
      assignments: [{ id: "assignment-1", employee_id: "emp-1", worksite_id: "site-1" }],
      dailyAttendance: [{ work_assignment_id: "assignment-1", work_date: "2026-03-02", intime: "2026-03-02T00:00:00.000Z" }],
    });

    expect(rows).toEqual([
      {
        id: "attendance-1",
        employeeName: "김철수",
        worksiteName: "본사",
        clockInDateTime: "2026-03-02 09:00",
        clockOutDateTime: "2026-03-02 18:30",
        workDuration: "9시간 30분",
        isLate: false,
      },
    ]);
  });

  it("marks attendance as late when clock-in is after the assigned daily start time", () => {
    const rows = buildAttendanceReport({
      employeeName: "김철수",
      year: "2026",
      employees: [{ id: "emp-1", name: "김철수" }],
      worksites: [{ id: "site-1", name: "본사" }],
      assignments: [{ id: "assignment-1", employee_id: "emp-1", worksite_id: "site-1" }],
      dailyAttendance: [
        { work_assignment_id: "assignment-1", work_date: "2026-03-02", intime: "2026-03-02T00:00:00.000Z" },
        { work_assignment_id: "assignment-1", work_date: "2026-03-03", intime: "2026-03-03T00:00:00.000Z" },
      ],
      attendance: [
        {
          id: "late-attendance",
          worksite_id: "site-1",
          employee_id: "emp-1",
          work_date: "2026-03-02",
          clock_in_at: "2026-03-02T00:01:00.000Z",
          clock_out_at: null,
        },
        {
          id: "on-time-attendance",
          worksite_id: "site-1",
          employee_id: "emp-1",
          work_date: "2026-03-03",
          clock_in_at: "2026-03-03T00:00:00.000Z",
          clock_out_at: null,
        },
      ],
    });

    expect(rows.map((row) => ({ id: row.id, isLate: row.isLate }))).toEqual([
      { id: "late-attendance", isLate: true },
      { id: "on-time-attendance", isLate: false },
    ]);
  });

  it("builds today's expected attendance status and excludes retired employees", () => {
    const rows = buildAttendanceStatus({
      date: "2026-09-11",
      now: new Date("2026-09-11T01:00:00.000Z"),
      employees: [
        { id: "emp-1", name: "김철수", role: "경비원", is_retired: false },
        { id: "emp-2", name: "이영희", role: "미화원", is_retired: false },
        { id: "emp-3", name: "퇴직자", role: "파견", is_retired: true },
      ],
      assignments: [
        { id: "assignment-1", employee_id: "emp-1", worksite_id: "site-1" },
        { id: "assignment-2", employee_id: "emp-2", worksite_id: "site-1" },
        { id: "assignment-3", employee_id: "emp-3", worksite_id: "site-1" },
      ],
      worksites: [{ id: "site-1", name: "본사" }],
      dailyAttendance: [
        { work_assignment_id: "assignment-1", work_date: "2026-09-11", intime: "2026-09-10T21:00:00.000Z" },
        { work_assignment_id: "assignment-2", work_date: "2026-09-11", intime: "2026-09-10T22:00:00.000Z" },
        { work_assignment_id: "assignment-3", work_date: "2026-09-11", intime: "2026-09-10T21:00:00.000Z" },
      ],
      attendance: [
        {
          id: "attendance-1",
          employee_id: "emp-1",
          worksite_id: "site-1",
          work_date: "2026-09-11",
          clock_in_at: "2026-09-10T21:05:00.000Z",
          clock_out_at: null,
        },
      ],
    });

    expect(rows).toEqual([
      {
        id: "assignment-1",
        employeeName: "김철수",
        role: "경비원",
        worksiteName: "본사",
        scheduledClockIn: "06:00",
        clockInTime: "06:05",
        status: "지각",
      },
      {
        id: "assignment-2",
        employeeName: "이영희",
        role: "미화원",
        worksiteName: "본사",
        scheduledClockIn: "07:00",
        clockInTime: null,
        status: "결근",
      },
    ]);
  });

  it("shows an employee as waiting before the scheduled clock-in time", () => {
    const rows = buildAttendanceStatus({
      date: "2026-09-11",
      now: new Date("2026-09-11T00:30:00.000Z"),
      employees: [{ id: "emp-1", name: "김철수", role: "경비원", is_retired: false }],
      assignments: [{ id: "assignment-1", employee_id: "emp-1", worksite_id: "site-1" }],
      worksites: [{ id: "site-1", name: "본사" }],
      dailyAttendance: [{ work_assignment_id: "assignment-1", work_date: "2026-09-11", intime: "2026-09-11T01:00:00.000Z" }],
      attendance: [],
    });

    expect(rows[0]).toMatchObject({
      employeeName: "김철수",
      clockInTime: null,
      status: "대기",
    });
  });

  it("loads attendance status through the admin client so RLS does not hide manager data", async () => {
    const dailyAttendanceQuery = { select: vi.fn(), eq: vi.fn(), not: vi.fn() };
    dailyAttendanceQuery.select.mockReturnValue(dailyAttendanceQuery);
    dailyAttendanceQuery.eq.mockReturnValue(dailyAttendanceQuery);
    dailyAttendanceQuery.not.mockResolvedValue({
      data: [{ work_assignment_id: "assignment-1", work_date: "2026-09-17", intime: "2026-09-17T00:00:00.000Z" }],
      error: null,
    });

    const attendanceQuery = { select: vi.fn(), eq: vi.fn() };
    attendanceQuery.select.mockReturnValue(attendanceQuery);
    attendanceQuery.eq.mockResolvedValue({
      data: [{ id: "attendance-1", employee_id: "emp-1", worksite_id: "site-1", work_date: "2026-09-17", clock_in_at: "2026-09-17T00:00:00.000Z", clock_out_at: null }],
      error: null,
    });

    const from = vi.fn((table: string) => {
      if (table === "work_assignment_daily_attendance") return dailyAttendanceQuery;
      if (table === "work_assignments") return { select: vi.fn().mockResolvedValue({ data: [{ id: "assignment-1", employee_id: "emp-1", worksite_id: "site-1" }], error: null }) };
      if (table === "employees") return { select: vi.fn().mockResolvedValue({ data: [{ id: "emp-1", name: "김철수", role: "경비원", is_retired: false }], error: null }) };
      if (table === "worksites") return { select: vi.fn().mockResolvedValue({ data: [{ id: "site-1", name: "본사" }], error: null }) };
      return attendanceQuery;
    });

    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    vi.mocked(getSupabase).mockReturnValue({ from: vi.fn() } as never);

    await expect(loadAttendanceStatus({ date: "2026-09-17" })).resolves.toEqual([
      expect.objectContaining({ employeeName: "김철수", status: "출근" }),
    ]);
    expect(getSupabase).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("employees");
    expect(from).toHaveBeenCalledWith("attendance_records");
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
    const updateSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attendance-1",
        work_date: "2026-06-04",
        clock_in_at: "2026-06-03T23:30:00.000Z",
        clock_out_at: "2026-06-04T10:00:00.000Z",
      },
      error: null,
    });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: updateSingle }),
      }),
    });
    const from = vi.fn().mockReturnValue({ update });
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
      clock_in_at: "2026-06-03T23:30:00.000Z",
      clock_out_at: "2026-06-04T10:00:00.000Z",
    });

    expect(update).toHaveBeenCalledWith({
      work_date: "2026-06-04",
      clock_in_at: "2026-06-03T23:30:00.000Z",
      clock_out_at: "2026-06-04T10:00:00.000Z",
      updated_at: expect.any(String),
    });
  });

  it("allows clearing the clock-out date-time", async () => {
    const updateSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attendance-1",
        work_date: "2026-06-04",
        clock_in_at: "2026-06-04T00:00:00.000Z",
        clock_out_at: null,
      },
      error: null,
    });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: updateSingle }),
      }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue({ update }) } as never);

    await updateAttendanceRecord({
      recordId: "attendance-1",
      clockInDateTime: "2026-06-04T09:00",
      clockOutDateTime: "",
    });

    expect(update).toHaveBeenCalledWith({
      work_date: "2026-06-04",
      clock_in_at: "2026-06-04T00:00:00.000Z",
      clock_out_at: null,
      updated_at: expect.any(String),
    });
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

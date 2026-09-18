import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateGuard, clockIn, clockOut, createAssignment, listAssignments, listAssignmentsForEmployee } from "./phase1-data";
import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";
import { getAssignmentDayOffCounts, isAssignmentDayOff } from "./assignment-days-off";

vi.mock("./supabase", () => ({
  getSupabase: vi.fn(),
}));

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("./assignment-days-off", () => ({
  getAssignmentDayOffCounts: vi.fn(),
  isAssignmentDayOff: vi.fn().mockResolvedValue(false),
}));

describe("guard authentication data rules", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(getAssignmentDayOffCounts).mockResolvedValue(new Map());
    vi.mocked(isAssignmentDayOff).mockResolvedValue(false);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T09:00:00+09:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects retired employees before creating a guard session", async () => {
    const employeeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "emp-1",
          name: "홍길동",
          phone: "010-1234-5678",
          phone_normalized: "01012345678",
          is_retired: true,
          role: "경비원",
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue(employeeQuery),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as never);

    await expect(
      authenticateGuard({ name: "홍길동", phone: "010-1234-5678" }),
    ).rejects.toThrow("해당직원은 퇴직처리되었습니다.");
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("employees");
  });

  it("finds today's assignment when today is inside the assignment period", async () => {
    const employeeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "emp-1",
          name: "홍길동",
          phone: "010-1234-5678",
          phone_normalized: "01012345678",
          is_retired: false,
          role: "경비원",
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "assign-1",
          employee_id: "emp-1",
          worksite_id: "work-1",
          start_date: "2026-05-25",
          end_date: "2026-05-27",
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const worksiteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "work-1",
          name: "본사",
          gps_info: { latitude: 37.5, longitude: 127 },
          radius_meters: 100,
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const openAttendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const todayAttendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const scheduledAttendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(employeeQuery)
        .mockReturnValueOnce(assignmentQuery)
        .mockReturnValueOnce(worksiteQuery)
        .mockReturnValueOnce(openAttendanceQuery)
        .mockReturnValueOnce(todayAttendanceQuery)
        .mockReturnValueOnce(scheduledAttendanceQuery),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as never);

    await expect(authenticateGuard({ name: "홍길동", phone: "010-1234-5678" })).resolves.toMatchObject({
      assignment: { id: "assign-1" },
      worksite: { id: "work-1" },
    });
    expect(assignmentQuery.eq).toHaveBeenCalledWith("employee_id", "emp-1");
    expect(assignmentQuery.lte).toHaveBeenCalledWith("start_date", "2026-05-26");
    expect(assignmentQuery.gte).toHaveBeenCalledWith("end_date", "2026-05-26");
    expect(isAssignmentDayOff).toHaveBeenCalledWith("assign-1", "2026-05-26");
  });

  it("loads an open previous-day attendance record into the guard session", async () => {
    const employeeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "emp-1",
          name: "Guard",
          phone: "010-1234-5678",
          phone_normalized: "01012345678",
          is_retired: false,
          role: "Guard",
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "assign-1",
          employee_id: "emp-1",
          worksite_id: "work-1",
          start_date: "2026-05-25",
          end_date: "2026-05-27",
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const worksiteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "work-1",
          name: "Worksite",
          gps_info: { latitude: 37.5, longitude: 127 },
          radius_meters: 100,
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const attendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "attendance-1",
          employee_id: "emp-1",
          worksite_id: "work-1",
          work_date: "2026-05-25",
          clock_in_at: "2026-05-25T23:00:00.000Z",
          clock_out_at: null,
        },
        error: null,
      }),
    };
    const scheduledAttendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(employeeQuery)
        .mockReturnValueOnce(assignmentQuery)
        .mockReturnValueOnce(worksiteQuery)
        .mockReturnValueOnce(attendanceQuery)
        .mockReturnValueOnce(scheduledAttendanceQuery),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as never);

    await expect(authenticateGuard({ name: "Guard", phone: "010-1234-5678" })).resolves.toMatchObject({
      attendance: {
        id: "attendance-1",
        work_date: "2026-05-25",
        clock_out_at: null,
      },
    });
    expect(attendanceQuery.eq).toHaveBeenCalledWith("employee_id", "emp-1");
    expect(attendanceQuery.is).toHaveBeenCalledWith("clock_out_at", null);
    expect(attendanceQuery.order).toHaveBeenCalledWith("clock_in_at", { ascending: false });
  });

  it("rejects overlapping assignment periods for the same employee", async () => {
    const supabaseAdmin = {
      rpc: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "이미 겹치는 근무기간 배정이 있습니다." },
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabaseAdmin as never);

    await expect(
      createAssignment({
        employeeId: "emp-1",
        worksiteId: "work-1",
        startDate: "2026-05-25",
        endDate: "2026-05-27",
      }),
    ).rejects.toThrow("이미 겹치는 근무기간 배정이 있습니다.");
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("create_assignment_with_daily_attendance", expect.objectContaining({
      p_employee_id: "emp-1",
      p_worksite_id: "work-1",
      p_start_date: "2026-05-25",
      p_end_date: "2026-05-27",
    }));
  });

  it("clocks out the latest open attendance record from a previous day", async () => {
    const attendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "attendance-1",
          employee_id: "emp-1",
          worksite_id: "work-1",
          work_date: "2026-05-25",
          clock_in_at: "2026-05-25T23:00:00.000Z",
          clock_out_at: null,
        },
        error: null,
      }),
    };
    const updateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "attendance-1",
          employee_id: "emp-1",
          worksite_id: "work-1",
          work_date: "2026-05-25",
          clock_in_at: "2026-05-25T23:00:00.000Z",
          clock_out_at: "2026-05-26T00:00:00.000Z",
        },
        error: null,
      }),
    };
    const worksiteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "work-1",
          name: "본사",
          gps_info: { latitude: 37.5, longitude: 127 },
          radius_meters: 100,
        },
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce(attendanceQuery)
        .mockReturnValueOnce(worksiteQuery)
        .mockReturnValueOnce(updateQuery),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as never);

    await expect(clockOut({ employeeId: "emp-1", latitude: 37.5, longitude: 127 })).resolves.toMatchObject({
      id: "attendance-1",
      work_date: "2026-05-25",
      clock_out_at: "2026-05-26T00:00:00.000Z",
    });
    expect(attendanceQuery.eq).toHaveBeenCalledWith("employee_id", "emp-1");
    expect(attendanceQuery.is).toHaveBeenCalledWith("clock_out_at", null);
    expect(attendanceQuery.order).toHaveBeenCalledWith("clock_in_at", { ascending: false });
    expect(worksiteQuery.eq).toHaveBeenCalledWith("id", "work-1");
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "attendance-1");
  });

  it("rejects clock-in when today is an assignment day off", async () => {
    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "assign-1",
          employee_id: "emp-1",
          worksite_id: "work-1",
          start_date: "2026-05-25",
          end_date: "2026-05-27",
        },
        error: null,
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue(assignmentQuery),
    } as never);
    vi.mocked(isAssignmentDayOff).mockResolvedValue(true);

    await expect(
      clockIn({
        employeeId: "emp-1",
        worksiteId: "work-1",
        latitude: 37.5,
        longitude: 127,
      }),
    ).rejects.toThrow("오늘은 휴무일로 지정되어 출근할 수 없습니다.");
    expect(isAssignmentDayOff).toHaveBeenCalledWith("assign-1", "2026-05-26");
  });

  it("listAssignments counts days off per assignment", async () => {
    const assignmentsQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (onfulfilled: (val: unknown) => unknown) =>
        Promise.resolve({
          data: [
            { id: "assign-1", employee_id: "emp-1", worksite_id: "work-1", start_date: "2026-05-21", end_date: "2026-05-23" },
            { id: "assign-2", employee_id: "emp-2", worksite_id: "work-2", start_date: "2026-05-24", end_date: "2026-05-25" },
          ],
          error: null,
        }).then(onfulfilled),
    };

    const employeesQuery = {
      select: vi.fn().mockResolvedValue({
        data: [
          { id: "emp-1", name: "홍길동", role: "경비원", work_style: "0" },
          { id: "emp-2", name: "김철수", role: "미화원", work_style: "2" },
        ],
        error: null,
      }),
    };

    const worksitesQuery = {
      select: vi.fn().mockResolvedValue({
        data: [
          { id: "work-1", name: "본사" },
          { id: "work-2", name: "서울지점" },
        ],
        error: null,
      }),
    };

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "work_assignments") return assignmentsQuery;
        if (table === "employees") return employeesQuery;
        if (table === "worksites") return worksitesQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as never);
    vi.mocked(getAssignmentDayOffCounts).mockResolvedValue(new Map([["assign-1", 2]]));
    vi.mocked(getSupabase).mockClear();

    const result = await listAssignments();
    expect(getSupabase).not.toHaveBeenCalled();
    expect(result).toEqual([
      {
        id: "assign-1",
        employee_id: "emp-1",
        worksite_id: "work-1",
        start_date: "2026-05-21",
        end_date: "2026-05-23",
        employee_name: "홍길동",
        employee_role: "경비원",
        employee_work_style: "0",
        worksite_name: "본사",
        days_off_count: 2,
      },
      {
        id: "assign-2",
        employee_id: "emp-2",
        worksite_id: "work-2",
        start_date: "2026-05-24",
        end_date: "2026-05-25",
        employee_name: "김철수",
        employee_role: "미화원",
        employee_work_style: "2",
        worksite_name: "서울지점",
        days_off_count: 0,
      },
    ]);
  });

  it("lists an employee's assignments with worksite names", async () => {
    const assignmentsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (onfulfilled: (val: unknown) => unknown) =>
        Promise.resolve({
          data: [
            { id: "assign-1", employee_id: "emp-1", worksite_id: "work-1", start_date: "2026-05-21", end_date: "2026-05-23" },
          ],
          error: null,
        }).then(onfulfilled),
    };
    const worksitesQuery = {
      select: vi.fn().mockResolvedValue({
        data: [{ id: "work-1", name: "본사" }],
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "work_assignments") return assignmentsQuery;
        if (table === "worksites") return worksitesQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(listAssignmentsForEmployee("emp-1")).resolves.toEqual([
      {
        id: "assign-1",
        employee_id: "emp-1",
        worksite_id: "work-1",
        start_date: "2026-05-21",
        end_date: "2026-05-23",
        worksite_name: "본사",
      },
    ]);
    expect(assignmentsQuery.eq).toHaveBeenCalledWith("employee_id", "emp-1");
    expect(assignmentsQuery.order).toHaveBeenCalledWith("start_date", { ascending: false });
  });
});

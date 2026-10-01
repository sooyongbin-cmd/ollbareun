import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateGuard, clockIn, clockOut, createAssignment, createEmployee, deleteAssignment, deleteAssignmentAfterToday, deleteAssignmentIncludingAttendance, deleteWorksite, listAssignmentManagementData, listAssignmentsForEmployee, loadGuardSessionByEmployeeId } from "./phase1-data";
import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";
import { isAssignmentDayOff } from "./assignment-days-off";

vi.mock("./supabase", () => ({
  getSupabase: vi.fn(),
}));

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("./assignment-days-off", () => ({
  isAssignmentDayOff: vi.fn().mockResolvedValue(false),
}));

function employeeRolesQuery(content = "경비원\n미화원\n주차원\n사감") {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { content }, error: null }),
  };
}

describe("guard authentication data rules", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(isAssignmentDayOff).mockResolvedValue(false);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T09:00:00+09:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the employee's work dates scheduled for today or ending today in Seoul", async () => {
    const employee = { id: "emp-1", name: "홍길동", role: "경비원" };
    const workDate = "2026-05-25";
    const scheduledShift = {
      id: "record-1",
      employee_id: "emp-1",
      worksite_id: "site-1",
      work_date: workDate,
      intime: "2026-05-25T22:00:00+09:00",
      outtime: "2026-05-26T06:00:00+09:00",
      work_intime: "2026-05-25T22:01:00+09:00",
      work_outtime: null,
    };
    const employeeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: employee, error: null }),
    };
    const assignment = {
      id: "assignment-1",
      employee_id: "emp-1",
      worksite_id: "site-1",
      start_date: "2026-05-20",
      end_date: "2026-05-30",
    };
    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: assignment, error: null }),
    };
    const scheduledQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [scheduledShift], error: null }),
    };
    const attendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { ...scheduledShift }, error: null }),
    };
    const worksiteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "site-1", name: "본사", gps_info: { latitude: 37.5, longitude: 127 }, radius_meters: 100 },
        error: null,
      }),
    };
    const workRecordQueries = [scheduledQuery, attendanceQuery];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "employees") return employeeQuery;
        if (table === "work_assignments") return assignmentQuery;
        if (table === "work_record") return workRecordQueries.shift();
        if (table === "worksites") return worksiteQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as never);

    const result = await loadGuardSessionByEmployeeId("emp-1");

    expect(scheduledQuery.select).toHaveBeenCalledWith(
      "id,employee_id,worksite_id,work_date,intime,outtime,work_intime,work_outtime",
    );
    expect(scheduledQuery.eq).toHaveBeenCalledWith("employee_id", "emp-1");
    expect(scheduledQuery.or).toHaveBeenCalledWith(
      "work_date.eq.2026-05-26,and(outtime.gte.2026-05-25T15:00:00.000Z,outtime.lt.2026-05-26T15:00:00.000Z)",
    );
    expect(scheduledQuery.order).toHaveBeenCalledWith("work_date", { ascending: true });
    expect(result).toMatchObject({
      attendance: { id: "record-1", work_date: workDate, work_intime: scheduledShift.work_intime },
      scheduledAttendances: [scheduledShift],
      worksite: { id: "site-1", name: "본사" },
    });
    expect(isAssignmentDayOff).toHaveBeenCalledWith("assignment-1", workDate);
  });

  it("accepts next-day elapsed clock-out input for alternate and night shifts and stores time of day", async () => {
    const existingEmployeesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const single = vi.fn().mockResolvedValue({ data: { id: "emp-1" }, error: null });
    const upsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) });
    const employeesFrom = vi.fn().mockReturnValueOnce(existingEmployeesQuery).mockReturnValue({ upsert });
    const rolesQuery = employeeRolesQuery();
    const supabase = { from: vi.fn((table: string) => table === "system_configs" ? rolesQuery : employeesFrom()) };

    await createEmployee({ name: "홍길동", phone: "01012345678", work_style: "2", in_time: "22:00", out_time: "30:00", has_weekend: true }, supabase as never);

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ work_style: "2", in_time: "22:00", out_time: 1800 }), { onConflict: "name,phone_normalized" });
    expect(upsert.mock.calls[0][0]).toHaveProperty("out_time", 1800);
    expect(upsert.mock.calls[0][0]).toHaveProperty("has_weekend", true);
  });

  it("saves employee hours and Saturday rules in a single RPC", async () => {
    const rules = [{ day_type: "saturday", is_working_day: true, in_time: "08:00", out_time: 1020 }];
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
    const rpc = vi.fn().mockResolvedValue({ data: { id: "emp-1", schedule_rules: rules }, error: null });
    const rolesQuery = employeeRolesQuery();
    const client = { from: vi.fn((table: string) => table === "system_configs" ? rolesQuery : query), rpc };
    await createEmployee({ name: "홍길동", phone: "01012345678", work_style: "0", in_time: "07:00", out_time: "18:00", schedule_rules: rules }, client as never);
    expect(rpc).toHaveBeenCalledWith("save_employee_with_schedule", {
      p_employee: expect.objectContaining({ in_time: "07:00", out_time: 1080, has_weekend: false }), p_rules: rules,
    });
    expect(client.from).toHaveBeenCalledTimes(2);
  });

  it("accepts a role registered in the employees_role system config", async () => {
    const rolesQuery = employeeRolesQuery();
    const employeesQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
    const rpc = vi.fn().mockResolvedValue({ data: { id: "emp-1", role: "사감" }, error: null });
    const client = { from: vi.fn((table: string) => table === "system_configs" ? rolesQuery : employeesQuery), rpc };

    await expect(createEmployee({
      name: "홍길동", phone: "01012345678", role: "사감", work_style: "0",
      in_time: "08:00", out_time: "18:00", schedule_rules: [],
    }, client as never)).resolves.toMatchObject({ role: "사감" });
    expect(rpc).toHaveBeenCalledWith("save_employee_with_schedule", expect.objectContaining({
      p_employee: expect.objectContaining({ role: "사감" }),
    }));
  });

  it("rejects a role that is not registered in the employees_role system config", async () => {
    const rolesQuery = employeeRolesQuery();
    const client = { from: vi.fn(() => rolesQuery) };

    await expect(createEmployee({ name: "홍길동", phone: "01012345678", role: "파견" }, client as never))
      .rejects.toThrow("등록되지 않은 직군입니다.");
  });

  it("uses the rule-aware assignment RPC even when the start date is a weekend", async () => {
    const rules = [{ day_type: "saturday", is_working_day: true, in_time: "08:00", out_time: 1020 }];
    const rpc = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "assign-1" }, error: null }) });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);
    await createAssignment({ employeeId: "emp-1", worksiteId: "site-1", startDate: "2030-01-05", endDate: "2030-01-06",
      work_style: "0", has_weekend: true, in_time: "07:00", out_time: "18:00", schedule_rules: rules });
    expect(rpc).toHaveBeenCalledWith("create_assignment_with_schedule_rules", expect.objectContaining({ p_schedule_rules: rules, p_in_time: "07:00" }));
  });

  it("rejects an existing active employee phone number", async () => {
    const existingEmployeesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ name: "김철수", phone_normalized: "01012345678" }], error: null }),
    };
    const rolesQuery = employeeRolesQuery();
    const supabase = { from: vi.fn((table: string) => table === "system_configs" ? rolesQuery : existingEmployeesQuery) };

    await expect(createEmployee({ name: "홍길동", phone: "010-1234-5678" }, supabase as never))
      .rejects.toThrow("동일한 연락처가 있습니다.");
  });

  it("rejects deleting a worksite that has assignments", async () => {
    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: "assignment-1" }], error: null }),
    };
    const worksiteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = {
      from: vi.fn((table: string) => table === "work_assignments" ? assignmentQuery : worksiteQuery),
    };

    await expect(deleteWorksite("work-1", supabase as never))
      .rejects.toThrow("근무지배정 자료가 있어서 삭제할 수 없습니다.");
    expect(assignmentQuery.eq).toHaveBeenCalledWith("worksite_id", "work-1");
    expect(worksiteQuery.delete).not.toHaveBeenCalled();
  });

  it("deletes a worksite when it has no assignments", async () => {
    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const worksiteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = {
      from: vi.fn((table: string) => table === "work_assignments" ? assignmentQuery : worksiteQuery),
    };

    await expect(deleteWorksite("work-1", supabase as never)).resolves.toBeUndefined();
    expect(worksiteQuery.eq).toHaveBeenCalledWith("id", "work-1");
  });

  it("reports a concurrent assignment when the database rejects worksite deletion", async () => {
    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const worksiteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: {
          code: "23503",
          message: 'violates foreign key constraint "work_assignments_worksite_id_fkey"',
        },
      }),
    };
    const supabase = {
      from: vi.fn((table: string) => table === "work_assignments" ? assignmentQuery : worksiteQuery),
    };

    await expect(deleteWorksite("work-1", supabase as never))
      .rejects.toThrow("근무지배정 자료가 있어서 삭제할 수 없습니다.");
  });

  it("rejects an existing active employee name", async () => {
    const existingEmployeesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ name: "홍길동", phone_normalized: "01099998888" }], error: null }),
    };
    const rolesQuery = employeeRolesQuery();
    const supabase = { from: vi.fn((table: string) => table === "system_configs" ? rolesQuery : existingEmployeesQuery) };

    await expect(createEmployee({ name: "홍길동", phone: "010-1234-5678" }, supabase as never))
      .rejects.toThrow("동일한 이름의 근무자가 있습니다.");
  });

  it("rejects over-24 clock-out time for regular shifts", async () => {
    await expect(createEmployee({ name: "홍길동", phone: "01012345678", work_style: "0", in_time: "08:00", out_time: "30:00" }, {} as never)).rejects.toThrow("퇴근시간을 올바르게 입력하세요.");
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
      maybeSingle: vi.fn().mockResolvedValue({
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
    const scheduledAttendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(employeeQuery)
        .mockReturnValueOnce(assignmentQuery)
        .mockReturnValueOnce(scheduledAttendanceQuery)
        .mockReturnValueOnce(worksiteQuery),
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
    const attendanceRow = {
      id: "attendance-1",
      employee_id: "emp-1",
      worksite_id: "work-1",
      work_date: "2026-05-25",
      intime: "2026-05-25T13:00:00.000Z",
      outtime: "2026-05-25T21:00:00.000Z",
      work_intime: "2026-05-25T14:01:00.000Z",
      work_outtime: null,
    };
    const attendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: attendanceRow, error: null }),
    };
    const scheduledAttendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{
        id: attendanceRow.id,
        employee_id: attendanceRow.employee_id,
        worksite_id: attendanceRow.worksite_id,
        work_date: attendanceRow.work_date,
        intime: attendanceRow.intime,
        outtime: attendanceRow.outtime,
        work_intime: attendanceRow.work_intime,
        work_outtime: attendanceRow.work_outtime,
      }], error: null }),
    };
    const worksiteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
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
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(employeeQuery)
        .mockReturnValueOnce(assignmentQuery)
        .mockReturnValueOnce(scheduledAttendanceQuery)
        .mockReturnValueOnce(attendanceQuery)
        .mockReturnValueOnce(worksiteQuery),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as never);

    await expect(authenticateGuard({ name: "Guard", phone: "010-1234-5678" })).resolves.toMatchObject({
      attendance: {
        id: "attendance-1",
        work_date: "2026-05-25",
        work_outtime: null,
      },
    });
    expect(scheduledAttendanceQuery.or).toHaveBeenCalled();
    expect(attendanceQuery.eq).toHaveBeenCalledWith("work_date", "2026-05-25");
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

  it("rejects a general assignment starting on a weekend or selected holiday", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const holidayQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
    };
    const rpc = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue(holidayQuery), rpc } as never);

    await expect(createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-30",
      endDate: "2026-06-30",
      work_style: "0",
      has_weekend: true,
    })).rejects.toThrow("근무기간의 첫날(2026-05-30)이 휴일입니다. 근무기간 시작일을 조정하세요.");

    expect(holidayQuery.eq).toHaveBeenNthCalledWith(1, "holiday_date", "2026-05-30");
    expect(holidayQuery.eq).toHaveBeenNthCalledWith(2, "selected", "Y");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects the first date when it is a selected public holiday", async () => {
    const holidayQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { holiday_date: "2026-05-25" }, error: null }),
    };
    const rpc = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue(holidayQuery), rpc } as never);

    await expect(createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-25",
      endDate: "2026-06-30",
      work_style: "0",
      has_weekend: true,
    })).rejects.toThrow("근무기간의 첫날(2026-05-25)이 휴일입니다. 근무기간 시작일을 조정하세요.");

    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a general assignment ending on a weekend or selected holiday", async () => {
    const holidayQueries: { eq: ReturnType<typeof vi.fn> }[] = [];
    const from = vi.fn(() => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      holidayQueries.push(query);
      return query;
    });
    const rpc = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from, rpc } as never);

    await expect(createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-25",
      endDate: "2026-05-30",
      work_style: "0",
      has_weekend: true,
    })).rejects.toThrow("근무기간의 마지막날(2026-05-30)이 휴일입니다. 근무기간 종료일을 조정하세요.");

    expect(holidayQueries).toHaveLength(2);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a general assignment ending on a selected public holiday", async () => {
    const holidayQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { holiday_date: "2026-05-29" }, error: null }),
    };
    const rpc = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue(holidayQuery), rpc } as never);

    await expect(createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-25",
      endDate: "2026-05-29",
      work_style: "0",
      has_weekend: true,
    })).rejects.toThrow("근무기간의 마지막날(2026-05-29)이 휴일입니다. 근무기간 종료일을 조정하세요.");

    expect(rpc).not.toHaveBeenCalled();
  });

  it("allows a general assignment to start on a holiday when the day-off option is disabled", async () => {
    const supabaseAdmin = {
      rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "assignment-1" }, error: null }) }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabaseAdmin as never);

    await createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-30",
      endDate: "2026-06-30",
      work_style: "0",
      has_weekend: false,
    });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("create_assignment_with_daily_attendance", expect.objectContaining({ p_has_weekend: false }));
  });

  it("rejects an alternate-day assignment when the final date has no clock-in", async () => {
    const rpc = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);

    await expect(createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-25",
      endDate: "2026-05-26",
      work_style: "1",
      has_weekend: false,
    })).rejects.toThrow("근무기간의 마지막날(2026-05-26)에 출근할 수 없습니다. 근무기간 종료일을 조정하세요.");

    expect(rpc).not.toHaveBeenCalled();
  });

  it("allows an alternate-day assignment when the final date has a clock-in", async () => {
    const supabaseAdmin = {
      rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "assignment-1" }, error: null }) }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabaseAdmin as never);

    await createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-25",
      endDate: "2026-05-27",
      work_style: "1",
      has_weekend: false,
    });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("create_assignment_with_daily_attendance", expect.objectContaining({
      p_work_style: "1",
      p_has_weekend: false,
      p_start_date: "2026-05-25",
      p_end_date: "2026-05-27",
    }));
  });

  it("allows a single-day night-shift assignment and requests attendance generation", async () => {
    const supabaseAdmin = {
      rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "assignment-1" }, error: null }) }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabaseAdmin as never);

    await createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-25",
      endDate: "2026-05-25",
      work_style: "2",
      has_weekend: false,
    });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("create_assignment_with_daily_attendance", expect.objectContaining({
      p_work_style: "2",
      p_has_weekend: false,
      p_start_date: "2026-05-25",
      p_end_date: "2026-05-25",
    }));
  });

  it("allows a night-shift assignment when the final date has a generated clock-in", async () => {
    const supabaseAdmin = {
      rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "assignment-1" }, error: null }) }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabaseAdmin as never);

    await createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-25",
      endDate: "2026-05-27",
      work_style: "2",
      has_weekend: false,
    });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("create_assignment_with_daily_attendance", expect.objectContaining({
      p_work_style: "2",
      p_has_weekend: false,
      p_start_date: "2026-05-25",
      p_end_date: "2026-05-27",
    }));
  });

  it("rejects a night assignment when the first and following dates are holidays", async () => {
    const rpc = vi.fn();
    const holidayQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue(holidayQuery), rpc } as never);

    await expect(createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-30",
      endDate: "2026-06-01",
      work_style: "2",
      has_weekend: true,
    })).rejects.toThrow("근무기간의 첫날(2026-05-30)의 다음날이 휴일입니다.");

    expect(rpc).not.toHaveBeenCalled();
  });

  it("allows a night assignment starting on a holiday when the following date is not a holiday", async () => {
    const supabaseAdmin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({ data: { holiday_date: "2026-05-25" }, error: null })
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: null, error: null }),
      }),
      rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "assignment-1" }, error: null }) }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabaseAdmin as never);

    await createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-25",
      endDate: "2026-05-27",
      work_style: "2",
      has_weekend: true,
    });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("create_assignment_with_daily_attendance", expect.objectContaining({
      p_work_style: "2",
      p_has_weekend: true,
    }));
  });

  it("rejects a night assignment ending on a holiday", async () => {
    const holidayQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { holiday_date: "2026-05-29" }, error: null }),
    };
    const rpc = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue(holidayQuery), rpc } as never);

    await expect(createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-27",
      endDate: "2026-05-29",
      work_style: "2",
      has_weekend: true,
    })).rejects.toThrow("근무기간의 마지막날(2026-05-29)이 휴일입니다.");

    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends an elapsed clock-out value as integer minutes to the assignment RPC", async () => {
    const supabaseAdmin = {
      rpc: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "assignment-1" }, error: null }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabaseAdmin as never);

    await createAssignment({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-09-28",
      endDate: "2026-09-29",
      work_style: "2",
      has_weekend: false,
      in_time: "08:00",
      out_time: "18:00",
    });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("create_assignment_with_daily_attendance", expect.objectContaining({
      p_work_style: "2",
      p_has_weekend: false,
      p_in_time: "08:00",
      p_out_time: 1080,
    }));
  });

  it("clocks out the latest open attendance record from a previous day", async () => {
    const attendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "attendance-1",
          employee_id: "emp-1",
          worksite_id: "work-1",
          work_date: "2026-05-25",
          work_intime: "2026-05-25T23:00:00.000Z",
          work_outtime: null,
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
          work_intime: "2026-05-25T23:00:00.000Z",
          work_outtime: "2026-05-26T00:00:00.000Z",
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

    await expect(clockOut({ employeeId: "emp-1", latitude: 37.5, longitude: 127, workDate: "2026-05-25" })).resolves.toMatchObject({
      id: "attendance-1",
      work_date: "2026-05-25",
      work_outtime: "2026-05-26T00:00:00.000Z",
    });
    expect(attendanceQuery.eq).toHaveBeenCalledWith("employee_id", "emp-1");
    expect(attendanceQuery.eq).toHaveBeenCalledWith("work_date", "2026-05-25");
    expect(attendanceQuery.is).toHaveBeenCalledWith("work_outtime", null);
    expect(worksiteQuery.eq).toHaveBeenCalledWith("id", "work-1");
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "attendance-1");
  });

  it("clocks in against the selected scheduled work date", async () => {
    const assignment = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "assignment-1" }, error: null }) };
    const worksite = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "site-1", name: "본사", gps_info: { latitude: 37.5, longitude: 127 }, radius_meters: 100 }, error: null }) };
    const existing = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "record-1", work_intime: null }, error: null }) };
    const rpc = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "record-1", work_intime: "2026-05-26T00:00:00.000Z" }, error: null }) });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValueOnce(assignment).mockReturnValueOnce(worksite).mockReturnValueOnce(existing), rpc } as never);
    await expect(clockIn({ employeeId: "emp-1", worksiteId: "site-1", workDate: "2026-05-25", latitude: 37.5, longitude: 127 })).resolves.toMatchObject({ id: "record-1" });
    expect(assignment.lte).toHaveBeenCalledWith("start_date", "2026-05-25");
    expect(assignment.gte).toHaveBeenCalledWith("end_date", "2026-05-25");
    expect(existing.eq).toHaveBeenCalledWith("work_date", "2026-05-25");
    expect(rpc).toHaveBeenCalledWith("save_attendance_with_education", expect.objectContaining({ p_record_id: "record-1", p_guard_clock_in: true, p_values: expect.objectContaining({ employee_id: "emp-1", work_date: "2026-05-25", work_intime: "2026-05-26T00:00:00.000Z" }) }));
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
        workDate: "2026-05-25",
        latitude: 37.5,
        longitude: 127,
      }),
    ).rejects.toThrow("선택한 근무일은 휴무일로 지정되어 출근할 수 없습니다.");
    expect(isAssignmentDayOff).toHaveBeenCalledWith("assign-1", "2026-05-25");
  });

  it("lists assignments and active employee and worksite filter options", async () => {
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
          { id: "emp-1", name: "홍길동", role: "경비원", work_style: "0", is_retired: false },
          { id: "emp-2", name: "김철수", role: "미화원", work_style: "2", is_retired: false },
          { id: "emp-3", name: "이영희", role: "미화원", work_style: "1", is_retired: false },
          { id: "emp-4", name: "퇴직자", role: "경비원", work_style: "0", is_retired: true },
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
    vi.mocked(getSupabase).mockClear();

    const result = await listAssignmentManagementData();
    expect(getSupabase).not.toHaveBeenCalled();
    expect(result.assignments).toEqual([
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
      },
    ]);
    expect(result.employeeNames).toEqual(["홍길동", "김철수", "이영희"]);
    expect(result.employeeNames).not.toContain("퇴직자");
    expect(result.worksiteNames).toEqual(["본사", "서울지점"]);
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

  it("deletes empty work records before deleting an assignment", async () => {
    const assignmentReadQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { employee_id: "emp-1", start_date: "2026-05-21", end_date: "2026-05-23" },
        error: null,
      }),
    };
    const workRecordCheckQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [{ id: "record-1", work_intime: null, work_outtime: null }], error: null }),
    };
    const workRecordDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ error: null }),
    };
    const assignmentDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce(assignmentReadQuery)
        .mockReturnValueOnce(workRecordCheckQuery)
        .mockReturnValueOnce(workRecordDeleteQuery)
        .mockReturnValueOnce(assignmentDeleteQuery),
    };

    await expect(deleteAssignment("assign-1", supabase as never)).resolves.toBeUndefined();
    expect(workRecordCheckQuery.select).toHaveBeenCalledWith("id,work_intime,work_outtime");
    expect(workRecordDeleteQuery.delete).toHaveBeenCalled();
    expect(assignmentDeleteQuery.delete).toHaveBeenCalled();
  });

  it("blocks assignment deletion when a work record has clock-in or clock-out data", async () => {
    const assignmentReadQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { employee_id: "emp-1", start_date: "2026-05-21", end_date: "2026-05-23" },
        error: null,
      }),
    };
    const workRecordCheckQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [{ id: "record-1", work_intime: "2026-05-21T00:00:00.000Z", work_outtime: null }], error: null }),
    };
    const supabase = {
      from: vi.fn().mockReturnValueOnce(assignmentReadQuery).mockReturnValueOnce(workRecordCheckQuery),
    };

    await expect(deleteAssignment("assign-1", supabase as never)).rejects.toThrow(
      "해당 기간에 출퇴근 자료가 있어서 삭제할 수 없습니다.",
    );
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("deletes an assignment and its attendance records through the dedicated RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = { rpc };

    await expect(deleteAssignmentIncludingAttendance("assign-1", supabase as never)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("delete_assignment_with_attendance", {
      p_assignment_id: "assign-1",
    });
  });

  it("deletes an assignment and only records after today through the dedicated RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = { rpc };

    await expect(deleteAssignmentAfterToday("assign-1", supabase as never)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("delete_assignment_after_today", {
      p_assignment_id: "assign-1",
    });
  });

  it("preserves today's clocked-in record in the after-today fallback", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function in the schema cache" },
    });
    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          employee_id: "emp-1",
          worksite_id: "site-1",
          start_date: "2026-05-25",
          end_date: "2026-05-27",
        },
        error: null,
      }),
    };
    const recordReadQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({
        data: [
          { id: "record-past", work_date: "2026-05-25", work_intime: null },
          { id: "record-today-clocked", work_date: "2026-05-26", work_intime: "2026-05-26T00:00:00.000Z" },
          { id: "record-today-unclocked", work_date: "2026-05-26", work_intime: null },
          { id: "record-future", work_date: "2026-05-27", work_intime: null },
        ],
        error: null,
      }),
    };
    const recordDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
    };
    const assignmentDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = {
      rpc,
      from: vi
        .fn()
        .mockReturnValueOnce(assignmentQuery)
        .mockReturnValueOnce(recordReadQuery)
        .mockReturnValueOnce(recordDeleteQuery)
        .mockReturnValueOnce(assignmentDeleteQuery),
    };

    await expect(deleteAssignmentAfterToday("assign-1", supabase as never)).resolves.toBeUndefined();
    expect(recordDeleteQuery.in).toHaveBeenCalledWith("id", ["record-today-unclocked", "record-future"]);
    expect(assignmentDeleteQuery.eq).toHaveBeenCalledWith("id", "assign-1");
  });

  it("falls back to direct deletes when the attendance deletion RPC is not in the schema cache", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function in the schema cache" },
    });
    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          employee_id: "emp-1",
          worksite_id: "site-1",
          start_date: "2026-05-21",
          end_date: "2026-05-23",
        },
        error: null,
      }),
    };
    const recordDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ error: null }),
    };
    const assignmentDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = {
      rpc,
      from: vi
        .fn()
        .mockReturnValueOnce(assignmentQuery)
        .mockReturnValueOnce(recordDeleteQuery)
        .mockReturnValueOnce(assignmentDeleteQuery),
    };

    await expect(deleteAssignmentIncludingAttendance("assign-1", supabase as never)).resolves.toBeUndefined();
    expect(recordDeleteQuery.eq).toHaveBeenCalledWith("worksite_id", "site-1");
    expect(assignmentDeleteQuery.eq).toHaveBeenCalledWith("id", "assign-1");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLeave, deleteLeave, getLeave, listLeaveScheduledWork, listLeaves, updateLeave } from "./leave";

describe("leave data", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists leave records with employee names and filters by name", async () => {
    const leaveQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn(),
    };
    leaveQuery.order.mockReturnValueOnce(leaveQuery).mockResolvedValueOnce({
      data: [{ id: "leave-1", employee_id: "emp-1", leave_type: "연차", start_date: "2026-06-01", end_date: "2026-06-03" }],
      error: null,
    });
    const employeesQuery = {
      select: vi.fn().mockResolvedValue({ data: [{ id: "emp-1", name: "홍길동", role: "경비원", work_style: "0" }], error: null }),
    };
    const assignmentsQuery = {
      select: vi.fn().mockResolvedValue({ data: [{ employee_id: "emp-1", worksite_id: "work-1", start_date: "2026-05-01", end_date: "2026-06-30" }], error: null }),
    };
    const worksitesQuery = {
      select: vi.fn().mockResolvedValue({ data: [{ id: "work-1", name: "본사" }], error: null }),
    };
    const supabase = {
      from: vi.fn((table: string) => ({
        leave: leaveQuery,
        employees: employeesQuery,
        work_assignments: assignmentsQuery,
        worksites: worksitesQuery,
      })[table]),
    };

    await expect(listLeaves({ employeeName: "홍" }, supabase as never)).resolves.toEqual([{
      id: "leave-1",
      employeeId: "emp-1",
      employeeName: "홍길동",
      employeeRole: "경비원",
      workStyle: "일반근무",
      leaveType: "연차",
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      worksiteName: "본사",
      assignmentStartDate: "2026-05-01",
      assignmentEndDate: "2026-06-30",
    }]);
    expect(leaveQuery.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("creates and updates a leave period with validated values", async () => {
    const createRpc = vi.fn().mockResolvedValue({ data: { id: "leave-1" }, error: null });
    const updateSingle = vi.fn().mockResolvedValue({ data: { id: "leave-1" }, error: null });
    const updateQuery = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: updateSingle };
    const supabase = { rpc: createRpc, from: vi.fn().mockReturnValue(updateQuery) };

    await expect(createLeave({ employeeId: "emp-1", leaveType: "월차", startDate: "2026-06-01", endDate: "2026-06-01" }, supabase as never)).resolves.toEqual({ id: "leave-1" });
    expect(createRpc).toHaveBeenCalledWith("create_leave_with_attendance", {
      p_employee_id: "emp-1",
      p_leave_type: "월차",
      p_start_date: "2026-06-01",
      p_end_date: "2026-06-01",
    });

    await expect(updateLeave({ id: "leave-1", employeeId: "emp-1", leaveType: "연차", startDate: "2026-06-02", endDate: "2026-06-03" }, supabase as never)).resolves.toEqual({ id: "leave-1" });
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "leave-1");
  });

  it("lists scheduled work within the leave period for an employee", async () => {
    const workRecordQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { work_date: "2026-06-01", intime: "2026-06-01T00:00:00.000Z", outtime: "2026-06-01T09:00:00.000Z" },
        ],
        error: null,
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(workRecordQuery) };

    await expect(listLeaveScheduledWork({ employeeId: "emp-1", startDate: "2026-06-01", endDate: "2026-06-03" }, supabase as never)).resolves.toEqual([
      { workDate: "2026-06-01", intime: "2026-06-01T00:00:00.000Z", outtime: "2026-06-01T09:00:00.000Z" },
    ]);
    expect(workRecordQuery.eq).toHaveBeenCalledWith("employee_id", "emp-1");
    expect(workRecordQuery.gte).toHaveBeenCalledWith("work_date", "2026-06-01");
    expect(workRecordQuery.lte).toHaveBeenCalledWith("work_date", "2026-06-03");
  });

  it("loads a leave detail and deletes it", async () => {
    const leaveReadQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "leave-1", employee_id: "emp-1", leave_type: "월차", start_date: "2026-06-01", end_date: "2026-06-01" }, error: null }),
    };
    const employeeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: "홍길동" }, error: null }),
    };
    const deleteRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValueOnce(leaveReadQuery).mockReturnValueOnce(employeeQuery), rpc: deleteRpc };

    await expect(getLeave("leave-1", supabase as never)).resolves.toMatchObject({ employeeName: "홍길동", leaveType: "월차" });
    await expect(deleteLeave("leave-1", supabase as never)).resolves.toBeUndefined();
    expect(deleteRpc).toHaveBeenCalledWith("delete_leave_with_attendance", { p_leave_id: "leave-1" });
  });

  it("rejects a reversed leave period", async () => {
    await expect(createLeave({ employeeId: "emp-1", leaveType: "월차", startDate: "2026-06-03", endDate: "2026-06-01" }, {} as never)).rejects.toThrow("종료일은 시작일보다 빠를 수 없습니다.");
  });
});

it("projects one registered leave with only its employee and overlapping assignment", async () => {
  const calls: unknown[][] = [];
  const data: Record<string, unknown[]> = {
    leave: [{ id: "new", employee_id: "e1", leave_type: "연차", start_date: "2026-10-01", end_date: "2026-10-02" }],
    employees: [{ id: "e1", name: "직원1", role: "경비원", work_style: "0" }],
    work_assignments: [{ employee_id: "e1", worksite_id: "site", start_date: "2026-09-01", end_date: "2026-10-31" }],
    worksites: [{ id: "site", name: "본사" }],
  };
  const client = { from: (table: string) => {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "gte", "lte", "in"]) builder[method] = (...args: unknown[]) => {
      calls.push([table, method, ...args]); return builder;
    };
    builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: data[table], error: null }).then(resolve);
    return builder;
  } };
  expect(await listLeaves({ id: "new" }, client as never)).toMatchObject([{ id: "new", employeeName: "직원1", employeeRole: "경비원", worksiteName: "본사", assignmentStartDate: "2026-09-01" }]);
  expect(calls).toContainEqual(["leave", "eq", "id", "new"]);
  expect(calls).toContainEqual(["employees", "eq", "id", "e1"]);
  expect(calls).toContainEqual(["work_assignments", "eq", "employee_id", "e1"]);
  expect(calls).toContainEqual(["work_assignments", "lte", "start_date", "2026-10-02"]);
  expect(calls).toContainEqual(["worksites", "in", "id", ["site"]]);
});

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
      data: [{ id: "leave-1", employee_id: "emp-1", leave_type: "2", start_date: "2026-06-01", end_date: "2026-06-03" }],
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
      leaveType: "2",
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      worksiteName: "본사",
      assignmentStartDate: "2026-05-01",
      assignmentEndDate: "2026-06-30",
    }]);
    expect(leaveQuery.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("creates and updates a leave period with validated values", async () => {
    const insertSingle = vi.fn().mockResolvedValue({ data: { id: "leave-1" }, error: null });
    const insertQuery = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: insertSingle };
    const updateSingle = vi.fn().mockResolvedValue({ data: { id: "leave-1" }, error: null });
    const updateQuery = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: updateSingle };
    const supabase = { from: vi.fn().mockReturnValueOnce(insertQuery).mockReturnValueOnce(updateQuery) };

    await expect(createLeave({ employeeId: "emp-1", leaveType: "1", startDate: "2026-06-01", endDate: "2026-06-01" }, supabase as never)).resolves.toEqual({ id: "leave-1" });
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ employee_id: "emp-1", leave_type: "1", start_date: "2026-06-01", end_date: "2026-06-01" }));

    await expect(updateLeave({ id: "leave-1", employeeId: "emp-1", leaveType: "2", startDate: "2026-06-02", endDate: "2026-06-03" }, supabase as never)).resolves.toEqual({ id: "leave-1" });
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
      single: vi.fn().mockResolvedValue({ data: { id: "leave-1", employee_id: "emp-1", leave_type: "1", start_date: "2026-06-01", end_date: "2026-06-01" }, error: null }),
    };
    const employeeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: "홍길동" }, error: null }),
    };
    const deleteQuery = { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    const supabase = { from: vi.fn().mockReturnValueOnce(leaveReadQuery).mockReturnValueOnce(employeeQuery).mockReturnValueOnce(deleteQuery) };

    await expect(getLeave("leave-1", supabase as never)).resolves.toMatchObject({ employeeName: "홍길동", leaveType: "1" });
    await expect(deleteLeave("leave-1", supabase as never)).resolves.toBeUndefined();
    expect(deleteQuery.eq).toHaveBeenCalledWith("id", "leave-1");
  });

  it("rejects a reversed leave period", async () => {
    await expect(createLeave({ employeeId: "emp-1", leaveType: "1", startDate: "2026-06-03", endDate: "2026-06-01" }, {} as never)).rejects.toThrow("종료일은 시작일보다 빠를 수 없습니다.");
  });
});

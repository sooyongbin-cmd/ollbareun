import { describe, expect, it, vi } from "vitest";
import { buildAttendanceReport, buildEducationReport, updateAttendanceRecord } from "./manager-reports";
import { getSupabaseAdmin } from "./supabase-admin";

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("manager reports", () => {
  it("filters attendance by employee name and year and formats duration", () => {
    const rows = buildAttendanceReport({
      employeeName: "김철수",
      year: "2026",
      employees: [
        { id: "emp-1", name: "김철수" },
        { id: "emp-2", name: "이영희" },
      ],
      attendance: [
        {
          id: "attendance-1",
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
    });

    expect(rows).toEqual([
      {
        id: "attendance-1",
        employeeName: "김철수",
        clockInDateTime: "2026-03-02 09:00",
        clockOutDateTime: "2026-03-02 18:30",
        workDuration: "9시간 30분",
      },
    ]);
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

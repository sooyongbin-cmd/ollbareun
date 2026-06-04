import { describe, expect, it } from "vitest";
import { buildAttendanceReport, buildEducationReport } from "./manager-reports";

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
          employee_id: "emp-1",
          work_date: "2026-03-02",
          clock_in_at: "2026-03-02T00:00:00.000Z",
          clock_out_at: "2026-03-02T09:30:00.000Z",
        },
        {
          employee_id: "emp-2",
          work_date: "2026-03-02",
          clock_in_at: "2026-03-02T00:00:00.000Z",
          clock_out_at: null,
        },
        {
          employee_id: "emp-1",
          work_date: "2025-03-02",
          clock_in_at: "2025-03-02T00:00:00.000Z",
          clock_out_at: null,
        },
      ],
    });

    expect(rows).toEqual([
      {
        date: "2026-03-02",
        clockInTime: "09:00",
        clockOutTime: "18:30",
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
});

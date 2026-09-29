import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import { currentEducationStatus, listEducationCompletions, loadEducationDays, markEducationCompletion, parseEducationFilters, readAllEducationRows } from "./education-completions";
import { educationToday, educationPeriodStart, requireEducationType } from "./education-periods";
import { saveAttendanceWithEducation } from "./attendance-education";

vi.mock("./supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

describe("period education", () => {
  it.each([
    ["daily", "2026-09-30", "2026-09-30"], ["monthly", "2026-09-30", "2026-09-01"],
    ["quarterly", "2026-09-30", "2026-07-01"], ["quarterly", "2026-10-01", "2026-10-01"],
    ["semiannual", "2026-06-30", "2026-01-01"], ["semiannual", "2026-07-01", "2026-07-01"],
    ["semiannual", "2027-01-01", "2027-01-01"],
  ] as const)("calculates %s period at %s", (type, date, expected) => {
    expect(educationPeriodStart(type, date)).toBe(expected);
  });
  it("uses KST midnight, independent of host timezone", () => {
    expect(educationToday(new Date("2026-09-29T14:59:59Z"))).toBe("2026-09-29");
    expect(educationToday(new Date("2026-09-29T15:00:00Z"))).toBe("2026-09-30");
  });
  it("rejects missing or unsupported categories", () => {
    expect(() => requireEducationType(undefined)).toThrow("안전교육구분");
    expect(() => requireEducationType("annual")).toThrow("안전교육구분");
  });
  it("reads the next page when results reach the database page size", async () => {
    const query = vi.fn().mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, id) => ({ id })), error: null })
      .mockResolvedValueOnce({ data: [{ id: 500 }], error: null });
    expect(await readAllEducationRows(query)).toHaveLength(501);
    expect(query).toHaveBeenLastCalledWith(500, 999);
  });
  it("queries current valid completions through the server client", async () => {
    const rpc = vi.fn().mockReturnValue({ range: vi.fn().mockResolvedValue({ data: [], error: null }) });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);
    await expect(listEducationCompletions()).resolves.toEqual([]);
    await currentEducationStatus("employee-1");
    expect(rpc).toHaveBeenCalledWith("current_education_status", { p_employee_id: "employee-1" });
  });
  it("lets the database choose completion date and preserve the first timestamp", async () => {
    const row = { employee_id: "e", resource_id: "r", education_date: "2026-09-30", is_completed: true };
    const rpc = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: row, error: null }) });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);
    expect(await markEducationCompletion({ employeeId: "e", resourceId: "r" })).toEqual(row);
    expect(rpc).toHaveBeenCalledWith("complete_education", { p_employee_id: "e", p_resource_id: "r" });
  });
  it("propagates the transaction failure instead of reporting attendance success", async () => {
    const rpc = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: "교육 대상 생성 실패" } }) });
    await expect(saveAttendanceWithEducation({ rpc } as never, { recordId: "r", values: { work_intime: "2026-09-29T00:00:00Z" } })).rejects.toThrow("교육 대상 생성 실패");
  });
  it.each(["from=2026-02-30", "from=2026-09-30&to=2026-09-01", "educationType=annual", "page=0"])("validates server filters: %s", (query) => {
    expect(() => parseEducationFilters(new URLSearchParams(query))).toThrow();
  });
});

it("paginates whole employees and keeps every attendance date with its matching education records", async () => {
  const attendance = Array.from({ length: 51 }, (_, index) => {
    const employee_id = `employee-${String(index).padStart(2, "0")}`;
    return ["2026-09-29", "2026-09-28"].map((work_date) => ({ employee_id, work_date, employees: { name: `직원${String(index).padStart(2, "0")}` } }));
  }).flat().reverse();
  const completions = ["2026-09-29", "2026-09-28", "2026-09-27"].map((education_date) => ({
    id: education_date, employee_id: "employee-00", resource_id: "daily", education_date, education_type: "daily",
    is_completed: false, completed_at: null, education_resources: { title: "일일교육" },
  }));
  const completionEmployeeIds: string[][] = [];
  const supabase = { from: vi.fn((table: string) => {
    let selectedEmployees: string[] | undefined;
    const query = {
      select: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      in: vi.fn((_column: string, ids: string[]) => {
        selectedEmployees = ids;
        completionEmployeeIds.push(ids);
        return query;
      }),
      range: vi.fn(async (from: number, to: number) => ({
        data: (table === "work_record" ? attendance : completions.filter((row) => selectedEmployees?.includes(row.employee_id))).slice(from, to + 1),
        error: null,
      })),
    };
    return query;
  }) };
  const first = await loadEducationDays(new URLSearchParams("from=2026-09-01&to=2026-09-30"), supabase as never);
  expect(first.total).toBe(51);
  expect(first.rows).toHaveLength(100);
  expect(new Set(first.rows.map((row) => row.employee_id)).size).toBe(50);
  expect(first.rows.slice(0, 2).map((row) => [row.employee_id, row.education_date, row.items.map((item) => item.id)])).toEqual([
    ["employee-00", "2026-09-28", ["2026-09-28"]], ["employee-00", "2026-09-29", ["2026-09-29"]],
  ]);
  const second = await loadEducationDays(new URLSearchParams("from=2026-09-01&to=2026-09-30&page=2"), supabase as never);
  expect(second.total).toBe(51);
  expect(second.rows.map((row) => [row.employee_id, row.education_date])).toEqual([
    ["employee-50", "2026-09-28"], ["employee-50", "2026-09-29"],
  ]);
  expect(completionEmployeeIds.map((ids) => ids.length)).toEqual([50, 1]);
  expect(completionEmployeeIds[1]).toEqual(["employee-50"]);
});

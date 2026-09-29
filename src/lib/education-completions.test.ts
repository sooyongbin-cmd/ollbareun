import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import { currentEducationStatus, listEducationCompletions, markEducationCompletion, parseEducationFilters, readAllEducationRows } from "./education-completions";
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

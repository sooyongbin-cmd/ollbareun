import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentEducationStatus, loadEducationDays, markEducationCompletion, parseEducationFilters, readAllEducationRows } from "./education-completions";
import { educationToday, educationPeriodStart, requireEducationType } from "./education-periods";
import { saveAttendance } from "./attendance";

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
  it("loads guard education status from the current snapshot columns", async () => {
    const today = educationToday();
    const rows = {
      education_resources: [{
        id: "resource-1", title: "일일 안전교육", youtube_link: "https://youtu.be/video",
        created_at: "2026-01-01T00:00:00+09:00", education_type: "일일",
      }],
      education_completions: [{
        id: "completion-1", employee_id: "employee-1", title: "일일 안전교육",
        work_date: today, education_type: "일일", completed_at: `${today}T01:00:00+09:00`,
      }],
    };
    const supabase = {
      rpc: vi.fn(),
      from: vi.fn((table: keyof typeof rows) => {
        const query = {
          select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(),
          range: vi.fn(async (from: number, to: number) => ({ data: rows[table].slice(from, to + 1), error: null })),
        };
        return query;
      }),
    };

    await expect(currentEducationStatus("employee-1", supabase as never)).resolves.toMatchObject([{
      employee_id: "employee-1", resource_id: "resource-1", resource_title: "일일 안전교육",
      education_type: "daily", is_completed: true, id: "completion-1",
    }]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it("creates a completion row with the snapshot title and supplied work date", async () => {
    const today = "2026-05-26";
    const resource = { id: "r", title: "안전교육", education_type: "일일" };
    const insertedRow = {
      id: "completion-1", employee_id: "e", title: "안전교육", work_date: today,
      education_type: "일일", completed_at: `${today}T01:00:00+09:00`,
    };
    let insertValues: Record<string, unknown> | null = null;
    const queries = {
      education_resources: vi.fn().mockImplementation(() => {
        const query = {
          select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: resource, error: null }),
        };
        return query;
      }),
      education_completions: vi.fn().mockImplementation(() => {
        const query = {
          select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn((values: Record<string, unknown>) => { insertValues = values; return query; }),
          single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
        };
        return query;
      }),
    };
    const supabase = { from: vi.fn((table: keyof typeof queries) => queries[table]()) };

    await expect(markEducationCompletion({ employeeId: "e", resourceId: "r", workDate: today }, supabase as never)).resolves.toEqual({
      id: "completion-1", employee_id: "e", resource_id: "r", education_date: today,
      education_type: "daily", is_completed: true, completed_at: insertedRow.completed_at,
    });
    expect(insertValues).toEqual({
      employee_id: "e", title: "안전교육", work_date: today, education_type: "일일",
      completed_at: expect.any(String),
    });
  });
  it("propagates the transaction failure instead of reporting attendance success", async () => {
    const rpc = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: "근태 저장 실패" } }) });
    await expect(saveAttendance({ rpc } as never, { recordId: "r", values: { work_intime: "2026-09-29T00:00:00Z" } })).rejects.toThrow("근태 저장 실패");
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
  const completions = ["2026-09-29", "2026-09-28", "2026-09-27"].map((work_date) => ({
    id: work_date, employee_id: "employee-00", title: "일일교육", work_date, education_type: "일일",
    completed_at: null,
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

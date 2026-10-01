import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { loadMonthlyEducationAttendance } from "./safety-education-attendance";

vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));

describe("monthly daily education attendance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists work records by work_date and marks daily completions for the same employee and date", async () => {
    const detailAttendance = [
      { employee_id: "employee-1", work_date: "2026-09-03", work_intime: "2026-09-03T00:00:00Z", employees: { name: "홍길동" } },
      { employee_id: "employee-1", work_date: "2026-09-04", work_intime: "2026-09-04T00:00:00Z", employees: { name: "홍길동" } },
      { employee_id: "employee-2", work_date: "2026-09-03", work_intime: "2026-09-03T00:00:00Z", employees: { name: "김철수" } },
      { employee_id: "employee-3", work_date: "2026-09-05", work_intime: null, employees: { name: "박길동" } },
    ];
    const dailyCompletions = [
      { employee_id: "employee-1", work_date: "2026-09-03", education_type: "일일", completed_at: "2026-09-03T01:00:00Z" },
      { employee_id: "employee-2", work_date: "2026-09-03", education_type: "일일", completed_at: null },
    ];
    const queries: { table: string; filters: [string, ...unknown[]][] }[] = [];
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn((table: string) => {
        const query = { table, filters: [] as [string, ...unknown[]][] };
        queries.push(query);
        const builder: Record<string, unknown> = {};
        for (const method of ["select", "not", "or", "gte", "gt", "lte", "lt", "eq", "in", "order"]) {
          builder[method] = (...args: unknown[]) => {
            query.filters.push([method, ...args]);
            return builder;
          };
        }
        builder.range = async (from: number, to: number) => {
          const isMonthlySummaryAttendance = table === "work_record"
            && query.filters.some(([method]) => method === "or");
          const isMonthlyDetailAttendance = table === "work_record" && !isMonthlySummaryAttendance;
          const isDailyCompletion = table === "education_completions"
            && query.filters.some(([method, column, value]) => method === "eq" && column === "education_type" && value === "일일");
          const rows = isMonthlyDetailAttendance
            ? detailAttendance.filter((record) => !query.filters.some(([method, column, operator, value]) =>
              method === "not" && column === "work_intime" && operator === "is" && value === null)
              || record.work_intime !== null)
            : isDailyCompletion ? dailyCompletions : [];
          return { data: rows.slice(from, to + 1), error: null };
        };
        return builder;
      }),
    } as never);

    const result = await loadMonthlyEducationAttendance("2026-09");

    expect(result.detailRows).toHaveLength(3);
    expect(result.detailRows.map((row) => [row.employeeName, row.workDate])).toEqual([
      ["홍길동", "2026-09-04"],
      ["홍길동", "2026-09-03"],
      ["김철수", "2026-09-03"],
    ]);
    expect(result.detailRows.find((row) => row.employeeId === "employee-1" && row.workDate === "2026-09-03")?.daily).toBe(true);
    expect(result.detailRows.find((row) => row.employeeId === "employee-1" && row.workDate === "2026-09-04")?.daily).toBe(false);
    expect(result.detailRows.find((row) => row.employeeId === "employee-2" && row.workDate === "2026-09-03")?.daily).toBe(false);

    const detailQuery = queries.find(({ table, filters }) => table === "work_record"
      && filters.some(([method]) => method === "gte"));
    expect(detailQuery?.filters).toContainEqual(["gte", "work_date", "2026-09-01"]);
    expect(detailQuery?.filters).toContainEqual(["lt", "work_date", "2026-10-01"]);
    expect(detailQuery?.filters).toContainEqual(["not", "work_intime", "is", null]);
    expect(detailQuery?.filters.some(([method]) => method === "or")).toBe(false);

    const completionQuery = queries.find(({ table, filters }) => table === "education_completions"
      && filters.some(([method, column, value]) => method === "eq" && column === "education_type" && value === "일일"));
    expect(completionQuery?.filters).toContainEqual(["in", "employee_id", ["employee-1", "employee-2"]]);
    expect(completionQuery?.filters).toContainEqual(["in", "work_date", ["2026-09-03", "2026-09-04"]]);
    expect(completionQuery?.filters).toContainEqual(["not", "completed_at", "is", null]);
  });
});

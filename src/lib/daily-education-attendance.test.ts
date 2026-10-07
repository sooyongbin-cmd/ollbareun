import { expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import { loadDailyEducationAttendance } from "./safety-education-attendance";
vi.mock("./supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));
it("counts active resources and same-date completions by subject, including other", async () => {
  const date = "2026-10-07";
  const resource = (id: string, type: string, startdate = date, enddate = date) => ({ id, title: id, education_type: type, startdate, enddate });
  const queries: { table: string; filters: unknown[][] }[] = [];
  const records: Record<string, unknown[]> = {
    work_record: [{ employee_id: "e1", work_date: date, employees: { name: "홍길동" } }, { employee_id: "e2", work_date: date, employees: { name: "김철수" } }],
    education_resources: [resource("d1", "일일"), resource("d2", "일일"), resource("q1", "분기"), resource("o1", "기타"), resource("o2", "기타"), resource("expired", "월간", "2026-01-01", "2026-10-06"), resource("future", "반기", "2026-10-08", "2026-12-31")],
    education_completions: [
      { employee_id: "e1", work_date: date, title: "d1", education_type: "일일" },
      { employee_id: "e1", work_date: date, title: "d1", education_type: "일일" },
      { employee_id: "e1", work_date: "2026-10-06", title: "d2", education_type: "일일" },
      { employee_id: "e1", work_date: date, title: "q1", education_type: "분기" },
      { employee_id: "e1", work_date: date, title: "o1", education_type: "기타" },
      { employee_id: "e1", work_date: date, title: "o2", education_type: "기타" },
      { employee_id: "e2", work_date: date, title: "d2", education_type: "일일" },
    ],
  };
  vi.mocked(getSupabaseAdmin).mockReturnValue({ from: (table: string) => {
    const query = { table, filters: [] as unknown[][] };
    queries.push(query);
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "not", "or", "order", "lte", "gte", "in", "eq"]) {
      builder[method] = (...args: unknown[]) => { query.filters.push([method, ...args]); return builder; };
    }
    builder.range = async () => ({ data: records[table], error: null });
    return builder;
  } } as never);
  const result = await loadDailyEducationAttendance(date);
  expect(result.resourceCounts).toEqual({ daily: 2, monthly: 0, quarterly: 1, semiannual: 0, other: 2 });
  expect(result.rows.find((row) => row.employeeId === "e1")).toMatchObject({ daily: 1, quarterly: 1, other: 2 });
  expect(result.rows.find((row) => row.employeeId === "e2")).toMatchObject({ daily: 1, quarterly: 0, other: 0 });
  const resources = queries.find((query) => query.table === "education_resources")!;
  expect(resources.filters).toContainEqual(["lte", "startdate", date]);
  expect(resources.filters).toContainEqual(["gte", "enddate", date]);
  expect(queries.find((query) => query.table === "education_completions")!.filters).toContainEqual(["eq", "work_date", date]);
});

import { beforeEach, expect, it, vi } from "vitest";
import { listSpecialRemarkReports } from "./special-remark-reports";
import { getSupabaseAdmin } from "./supabase-admin";
vi.mock("./supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
it("uses KST month boundaries and sorts by worksite, name and report timestamp", async () => {
  const records = [
    { id: "d", worksite_name: "하늘", employee_name: "김철수", reported_at: "2026-12-01T00:00:00Z" },
    { id: "c", worksite_name: "가람", employee_name: "홍길동", reported_at: "2026-12-01T00:00:00Z" },
    { id: "b", worksite_name: "가람", employee_name: "김철수", reported_at: "2026-12-02T00:00:00Z" },
    { id: "a", worksite_name: "가람", employee_name: "김철수", reported_at: "2026-12-01T00:00:00Z" },
  ].map((record) => ({ ...record, photo_url: null, photo_urls: [], employees: record.id === "d" ? null : { role: "경비원", work_style: "1" } }));
  const filters: unknown[][] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "order", "gte", "lt"]) builder[method] = (...args: unknown[]) => { filters.push([method, ...args]); return builder; };
  builder.then = (resolve: (result: unknown) => unknown) => Promise.resolve({ data: records, error: null }).then(resolve);
  vi.mocked(getSupabaseAdmin).mockReturnValue({ from: () => builder } as never);
  const result = await listSpecialRemarkReports({ yearMonth: "2026-12" });
  expect(filters).toContainEqual(["gte", "reported_at", "2026-12-01T00:00:00+09:00"]);
  expect(filters).toContainEqual(["lt", "reported_at", "2027-01-01T00:00:00+09:00"]);
  expect(filters).toContainEqual(["select", "*,employees(role,work_style)"]);
  expect(result.map((record) => record.id)).toEqual(["a", "b", "c", "d"]);
  expect(result[0]).toMatchObject({ employee_role: "경비원", work_style: "1" });
  expect(result[3]).toMatchObject({ employee_name: "김철수", employee_role: "-", work_style: null });
});
it("rejects invalid year-month filters before querying", async () => {
  for (const yearMonth of ["2026", "2026-00", "2026-13"]) await expect(listSpecialRemarkReports({ yearMonth })).rejects.toThrow("조회년월을 확인하세요.");
  expect(getSupabaseAdmin).not.toHaveBeenCalled();
});

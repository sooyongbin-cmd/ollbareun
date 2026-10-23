import { afterEach, expect, it, vi } from "vitest";
import { loadMonthlyAttendance } from "./monthly-attendance";
import { getSupabaseAdmin } from "./supabase-admin";
vi.mock("./supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));
afterEach(() => vi.useRealTimers());
it("selects a complete leap month by work_date and reuses attendance statuses without duplicating overnight records", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-03-05T00:00:00Z"));
  const records = [
    { id: "a", employee_id: "e", worksite_id: "w", work_date: "2024-02-28", intime: "2024-02-28T22:00:00+09:00", outtime: "2024-02-29T06:00:00+09:00", work_intime: "2024-02-28T22:05:00+09:00", work_outtime: "2024-02-29T05:55:00+09:00", intime_status: "1", outtime_status: "1" },
    { id: "b", employee_id: "e", worksite_id: "w", work_date: "2024-02-29", intime: "2024-02-29T22:00:00+09:00", outtime: "2024-03-01T06:00:00+09:00", work_intime: null, work_outtime: null, intime_status: "3", outtime_status: "0" },
  ];
  const filters: unknown[][] = [];
  vi.mocked(getSupabaseAdmin).mockReturnValue({ from: (table: string) => {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "gte", "lt", "order"]) builder[method] = (...args: unknown[]) => {
      if (table === "work_record") filters.push([method, ...args]);
      return builder;
    };
    builder.range = async () => ({ data: table === "work_record" ? records : table === "employees"
      ? [{ id: "e", name: "홍길동", role: "경비원", work_style: "1" }] : [{ id: "w", name: "본사" }], error: null });
    return builder;
  } } as never);
  const result = await loadMonthlyAttendance("2024-02");
  expect(filters).toContainEqual(["gte", "work_date", "2024-02-01"]);
  expect(filters).toContainEqual(["lt", "work_date", "2024-03-01"]);
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({ id: "a", status: "지각", outtimeLabel: "조퇴", scheduledClockOut: "2024-02-29 06:00", worksiteName: "본사" });
  expect(result[1]).toMatchObject({ id: "b", status: "휴가", outtimeLabel: "" });
});
it("rejects invalid months before accessing the database", async () => {
  for (const month of ["", "2026-13", "2026-00", "2026-1"]) {
    await expect(loadMonthlyAttendance(month)).rejects.toThrow("조회년월을 확인하세요.");
  }
});

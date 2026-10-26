import { expect, it, vi } from "vitest";
import { insertHolidayRecords } from "./public-holidays";
import { getSupabaseAdmin } from "./supabase-admin";
vi.mock("./supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));

it("returns persisted holiday IDs directly from the insert and preserves duplicate handling", async () => {
  const row = { holiday_date: "2026-10-03", name: "개천절", selected: "Y" };
  const select = vi.fn().mockResolvedValueOnce({ data: [{ ...row, id: "stored-id", holiday_type: "public" }], error: null })
    .mockResolvedValueOnce({ data: [], error: null });
  const upsert = vi.fn(() => ({ select }));
  vi.mocked(getSupabaseAdmin).mockReturnValue({ from: () => ({ upsert }) } as never);
  expect(await insertHolidayRecords([row])).toMatchObject([{ id: "stored-id", name: "개천절" }]);
  expect(select).toHaveBeenCalledWith("id,holiday_date,name,selected,holiday_type");
  expect(upsert).toHaveBeenCalledWith([{ ...row, holiday_type: "public" }], { onConflict: "holiday_date", ignoreDuplicates: true });
  expect(await insertHolidayRecords([row])).toEqual([]);
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import { deleteYearData, getYearDataSummary, requireDataYear, specialRemarkPhotoPath } from "./year-data-management";

vi.mock("./supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));

describe("year data management", () => {
  it.each([undefined, 2027, 2024])("selects the earliest year by default while preserving a valid selection (%s)", async (requestedYear) => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: [{ year: 2025 }, { year: 2026 }, { year: 2027 }], error: null })
      .mockResolvedValueOnce({ data: {}, error: null });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);
    const year = requestedYear === 2027 ? 2027 : 2025;
    expect((await getYearDataSummary(requestedYear)).year).toBe(year);
    expect(rpc).toHaveBeenLastCalledWith("get_year_data_counts", { p_year: year });
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([null, "", "2026 or 1=1", 0, 10000, "2026.5"])("rejects unsafe year %s", (year) => {
    expect(() => requireDataYear(year)).toThrow();
  });
  it("parses signed and public photo URLs without leaking query strings", () => {
    expect(specialRemarkPhotoPath("https://db.test/storage/v1/object/sign/special-remarks/employee/photo%20one.jpg?token=secret", "https://db.test")).toBe("employee/photo one.jpg");
    expect(() => specialRemarkPhotoPath("https://other.test/storage/v1/object/public/special-remarks/a.jpg", "https://db.test")).toThrow();
    expect(() => specialRemarkPhotoPath("https://db.test/storage/v1/object/public/other/a.jpg", "https://db.test")).toThrow();
  });

  function deletionMock(failStorage = false) {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.test");
    const events: string[] = [];
    const reports = [{ id: "report-1", photo_url: "https://db.test/storage/v1/object/public/special-remarks/one.jpg", photo_urls: ["https://db.test/storage/v1/object/public/special-remarks/one.jpg", "https://db.test/storage/v1/object/public/special-remarks/two.jpg"] }];
    const range = vi.fn().mockResolvedValue({ data: reports, error: null });
    const query = { select: vi.fn(), gte: vi.fn(), lt: vi.fn(), order: vi.fn(), range };
    query.select.mockReturnValue(query); query.gte.mockReturnValue(query); query.lt.mockReturnValue(query); query.order.mockReturnValue(query);
    const remove = vi.fn(async () => { events.push("photos"); return { error: failStorage ? { message: "storage failed" } : null }; });
    const rpc = vi.fn(async () => { events.push("rows"); return { data: {}, error: null }; });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn(() => query), storage: { from: vi.fn(() => ({ remove })) }, rpc } as never);
    return { events, reports, remove, rpc, query };
  }

  it("deletes deduplicated photos before requesting atomic row deletion", async () => {
    const mock = deletionMock();
    await deleteYearData(2026);
    expect(mock.events).toEqual(["photos", "rows"]);
    expect(mock.remove).toHaveBeenCalledWith(["one.jpg", "two.jpg"]);
    expect(mock.query.gte).toHaveBeenCalledWith("reported_at", "2026-01-01T00:00:00+09:00");
    expect(mock.query.lt).toHaveBeenCalledWith("reported_at", "2027-01-01T00:00:00+09:00");
    expect(mock.rpc).toHaveBeenCalledWith("delete_year_data", { p_year: 2026, p_reports: mock.reports });
  });

  it("never deletes rows after a photo deletion failure", async () => {
    const mock = deletionMock(true);
    await expect(deleteYearData(2026)).rejects.toThrow("DB 자료는 삭제하지 않았습니다");
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("reads additional pages when there are more than 500 reports", async () => {
    const mock = deletionMock();
    mock.query.range.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, index) => ({ id: `report-${index}`, photo_url: null, photo_urls: null })), error: null });
    await deleteYearData(2026);
    expect(mock.query.range.mock.calls).toEqual([[0, 499], [500, 999]]);
    expect(mock.rpc.mock.calls[0]).toBeDefined();
  });
});

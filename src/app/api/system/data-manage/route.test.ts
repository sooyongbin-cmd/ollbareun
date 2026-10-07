import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { deleteYearData, getYearDataSummary } from "@/lib/year-data-management";
import { DELETE, GET } from "./route";

vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/year-data-management", () => ({ deleteYearData: vi.fn(), getYearDataSummary: vi.fn() }));

describe("year data API", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getManagerUser).mockResolvedValue({ id: "manager" } as never); });
  const request = (body: unknown, origin?: string) => new Request("https://app.test/api/system/data-manage", { method: "DELETE", headers: { "Content-Type": "application/json", ...(origin ? { origin } : {}) }, body: JSON.stringify(body) });
  it("requires a manager for reading and deleting", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);
    expect((await GET(new Request("https://app.test/api/system/data-manage"))).status).toBe(401);
    expect((await DELETE(request({ year: 2026, confirmed: true }))).status).toBe(401);
    expect(deleteYearData).not.toHaveBeenCalled();
    expect(getYearDataSummary).not.toHaveBeenCalled();
  });
  it("requires final confirmation and same origin", async () => {
    expect((await DELETE(request({ year: 2026 }))).status).toBe(400);
    expect((await DELETE(request({ year: 2026, confirmed: true }, "https://other.test"))).status).toBe(403);
    expect(deleteYearData).not.toHaveBeenCalled();
  });
  it("deletes only the validated request year after confirmation", async () => {
    vi.mocked(deleteYearData).mockResolvedValue({ work_record: 1 } as never);
    expect((await DELETE(request({ year: 2026, confirmed: true }))).status).toBe(200);
    expect(deleteYearData).toHaveBeenCalledWith(2026);
  });
});

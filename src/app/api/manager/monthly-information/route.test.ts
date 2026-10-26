import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getManagerUser } from "@/lib/manager-auth";
import { loadMonthlyInformation } from "@/lib/monthly-information";
vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/monthly-information", () => ({ loadMonthlyInformation: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it("requires manager authentication", async () => {
  vi.mocked(getManagerUser).mockResolvedValue(null);
  expect((await GET(new Request("http://localhost/api/manager/monthly-information?yearMonth=2026-10"))).status).toBe(401);
  expect(loadMonthlyInformation).not.toHaveBeenCalled();
});
it("loads the selected month and reports failures", async () => {
  vi.mocked(getManagerUser).mockResolvedValue({ id: "manager" } as never);
  vi.mocked(loadMonthlyInformation).mockResolvedValue([]);
  const response = await GET(new Request("http://localhost/api/manager/monthly-information?yearMonth=2026-10"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ rows: [] });
  expect(loadMonthlyInformation).toHaveBeenCalledWith("2026-10");
  vi.mocked(loadMonthlyInformation).mockRejectedValue(new Error("조회년월을 확인하세요."));
  expect((await GET(new Request("http://localhost/api/manager/monthly-information"))).status).toBe(400);
});

it("scopes a partial refresh to one employee and rejects empty scopes", async () => {
  vi.mocked(getManagerUser).mockResolvedValue({ id: "manager" } as never);
  vi.mocked(loadMonthlyInformation).mockResolvedValue([]);
  expect((await GET(new Request("http://localhost/api/manager/monthly-information?yearMonth=2026-10&employeeId=e1"))).status).toBe(200);
  expect(loadMonthlyInformation).toHaveBeenCalledWith("2026-10", "e1");
  vi.mocked(loadMonthlyInformation).mockClear();
  expect((await GET(new Request("http://localhost/api/manager/monthly-information?yearMonth=2026-10&employeeId="))).status).toBe(400);
  expect(loadMonthlyInformation).not.toHaveBeenCalled();
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getManagerUser } from "@/lib/manager-auth";
import { loadMonthlyAttendance } from "@/lib/monthly-attendance";
vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/monthly-attendance", () => ({ loadMonthlyAttendance: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
describe("worker information API", () => {
  it("requires a manager session before loading personal information", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);
    expect(
      (
        await GET(
          new Request("http://localhost/api/manager/worker-information"),
        )
      ).status,
    ).toBe(401);
    expect(loadMonthlyAttendance).not.toHaveBeenCalled();
  });
  it("passes the selected period and reports validation failures", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager" } as never);
    vi.mocked(loadMonthlyAttendance).mockResolvedValue([]);
    expect(
      (
        await GET(
          new Request(
            "http://localhost/api/manager/worker-information?yearMonth=2026-10",
          ),
        )
      ).status,
    ).toBe(200);
    expect(loadMonthlyAttendance).toHaveBeenCalledWith(
      "2026-10",
    );
    vi.mocked(loadMonthlyAttendance).mockRejectedValue(
      new Error("조회년월을 확인하세요."),
    );
    expect(
      (
        await GET(
          new Request("http://localhost/api/manager/worker-information"),
        )
      ).status,
    ).toBe(400);
  });
});

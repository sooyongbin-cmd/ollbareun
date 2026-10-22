import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getManagerUser } from "@/lib/manager-auth";
import { loadWorkerInformation } from "@/lib/worker-information";
vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/worker-information", () => ({ loadWorkerInformation: vi.fn() }));
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
    expect(loadWorkerInformation).not.toHaveBeenCalled();
  });
  it("passes the selected period and reports validation failures", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager" } as never);
    vi.mocked(loadWorkerInformation).mockResolvedValue([]);
    expect(
      (
        await GET(
          new Request(
            "http://localhost/api/manager/worker-information?start=2026-10-01&end=2026-10-22",
          ),
        )
      ).status,
    ).toBe(200);
    expect(loadWorkerInformation).toHaveBeenCalledWith(
      "2026-10-01",
      "2026-10-22",
    );
    vi.mocked(loadWorkerInformation).mockRejectedValue(
      new Error("종료일을 확인하세요."),
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

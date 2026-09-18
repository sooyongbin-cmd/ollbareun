import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { listLeaveScheduledWork } from "@/lib/leave";
import { GET } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/leave", () => ({
  listLeaveScheduledWork: vi.fn(),
}));

describe("/api/leave/schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns scheduled work for an authenticated manager", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(listLeaveScheduledWork).mockResolvedValue([
      { workDate: "2026-06-01", intime: "2026-06-01T00:00:00.000Z", outtime: "2026-06-01T09:00:00.000Z" },
    ]);

    const response = await GET(new Request("http://localhost/api/leave/schedule?employeeId=emp-1&startDate=2026-06-01&endDate=2026-06-03"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      workRecords: [{ workDate: "2026-06-01", intime: "2026-06-01T00:00:00.000Z", outtime: "2026-06-01T09:00:00.000Z" }],
    });
    expect(listLeaveScheduledWork).toHaveBeenCalledWith(
      { employeeId: "emp-1", startDate: "2026-06-01", endDate: "2026-06-03" },
      expect.anything(),
    );
  });

  it("denies access without a manager session", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/leave/schedule?employeeId=emp-1&startDate=2026-06-01&endDate=2026-06-03"));

    expect(response.status).toBe(401);
    expect(listLeaveScheduledWork).not.toHaveBeenCalled();
  });
});

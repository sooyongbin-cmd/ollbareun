import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { loadAttendanceStatus } from "@/lib/manager-reports";
import { GET } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/manager-reports", () => ({
  loadAttendanceStatus: vi.fn(),
}));

describe("/api/manager/reports/attendance/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns attendance status rows for an authenticated manager", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(loadAttendanceStatus).mockResolvedValue([{ id: "assignment-1" }] as never);

    const response = await GET(new Request("http://localhost/api/manager/reports/attendance/status?date=2026-09-17"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ date: "2026-09-17", rows: [{ id: "assignment-1" }] });
    expect(loadAttendanceStatus).toHaveBeenCalledWith({ date: "2026-09-17" });
  });

  it("denies attendance status access without a manager session", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/manager/reports/attendance/status?date=2026-09-17"));

    expect(response.status).toBe(401);
    expect(loadAttendanceStatus).not.toHaveBeenCalled();
  });
});

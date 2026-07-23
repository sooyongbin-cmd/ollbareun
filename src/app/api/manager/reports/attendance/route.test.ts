import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeAttendanceRecord, loadAttendanceReport } from "@/lib/manager-reports";
import { getManagerUser } from "@/lib/manager-auth";
import { GET, PATCH } from "./route";

vi.mock("@/lib/manager-reports", () => ({
  completeAttendanceRecord: vi.fn(),
  loadAttendanceReport: vi.fn(),
}));

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

describe("/api/manager/reports/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
  });

  it("loads attendance rows", async () => {
    vi.mocked(loadAttendanceReport).mockResolvedValue([{ id: "attendance-1" }] as never);

    const response = await GET(new Request("http://localhost/api/manager/reports/attendance?employeeName=&year=2026"));

    expect(response.status).toBe(200);
    expect(loadAttendanceReport).toHaveBeenCalledWith({ employeeName: "", year: "2026" });
  });

  it("denies clock-out processing if the manager is not logged in", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/manager/reports/attendance", {
        method: "PATCH",
        body: JSON.stringify({ recordId: "attendance-1", clockOutDateTime: "2026-06-04T19:00" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(completeAttendanceRecord).not.toHaveBeenCalled();
  });

  it("saves the manager-entered clock-out date and time", async () => {
    vi.mocked(completeAttendanceRecord).mockResolvedValue({
      id: "attendance-1",
      clock_out_at: "2026-06-04T10:00:00.000Z",
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/manager/reports/attendance", {
        method: "PATCH",
        body: JSON.stringify({ recordId: "attendance-1", clockOutDateTime: "2026-06-04T19:00" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(completeAttendanceRecord).toHaveBeenCalledWith({
      recordId: "attendance-1",
      clockOutDateTime: "2026-06-04T19:00",
    });
  });
});

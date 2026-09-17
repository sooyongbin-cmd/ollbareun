import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadAttendanceReport, updateAttendanceRecord } from "@/lib/manager-reports";
import { getManagerUser } from "@/lib/manager-auth";
import { GET, PATCH } from "./route";

vi.mock("@/lib/manager-reports", () => ({
  loadAttendanceReport: vi.fn(),
  updateAttendanceRecord: vi.fn(),
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

  it("denies attendance report access without a manager session", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/manager/reports/attendance?employeeName=&year=2026"));

    expect(response.status).toBe(401);
    expect(loadAttendanceReport).not.toHaveBeenCalled();
  });

  it("denies attendance editing if the manager is not logged in", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/manager/reports/attendance", {
        method: "PATCH",
        body: JSON.stringify({
          recordId: "attendance-1",
          clockInDateTime: "2026-06-04T08:30",
          clockOutDateTime: "2026-06-04T19:00",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(updateAttendanceRecord).not.toHaveBeenCalled();
  });

  it("saves the manager-entered clock-in and clock-out date-time values", async () => {
    vi.mocked(updateAttendanceRecord).mockResolvedValue({
      id: "attendance-1",
      clock_in_at: "2026-06-03T23:30:00.000Z",
      clock_out_at: "2026-06-04T10:00:00.000Z",
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/manager/reports/attendance", {
        method: "PATCH",
        body: JSON.stringify({
          recordId: "attendance-1",
          clockInDateTime: "2026-06-04T08:30",
          clockOutDateTime: "2026-06-04T19:00",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateAttendanceRecord).toHaveBeenCalledWith({
      recordId: "attendance-1",
      clockInDateTime: "2026-06-04T08:30",
      clockOutDateTime: "2026-06-04T19:00",
    });
  });
});

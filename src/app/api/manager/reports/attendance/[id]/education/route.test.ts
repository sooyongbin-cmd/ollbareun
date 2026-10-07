import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { loadAttendanceRecord } from "@/lib/manager-reports";
import { markAttendanceEducationCompletions } from "@/lib/education-completions";
import { POST } from "./route";

vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/manager-reports", () => ({ loadAttendanceRecord: vi.fn() }));
vi.mock("@/lib/education-completions", () => ({ markAttendanceEducationCompletions: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => ({}) }));
const request = () => new Request("https://app.test/api/manager/reports/attendance/a/education", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceId: "r", employeeId: "fake", workDate: "2099-01-01" }) });
const context = { params: Promise.resolve({ id: "a" }) };

describe("attendance education completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager" } as never);
    vi.mocked(loadAttendanceRecord).mockResolvedValue({ employeeId: "employee", workDate: "2026-10-07", clockInDateTime: "2026-10-07 09:00" } as never);
    vi.mocked(markAttendanceEducationCompletions).mockResolvedValue([]);
  });
  it("uses the authenticated attendance record's employee and date", async () => {
    expect((await POST(request(), context)).status).toBe(200);
    expect(markAttendanceEducationCompletions).toHaveBeenCalledWith({ employeeId: "employee", workDate: "2026-10-07", resourceIds: ["r"] });
  });
  it("requires manager authentication", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);
    expect((await POST(request(), context)).status).toBe(401);
    expect(markAttendanceEducationCompletions).not.toHaveBeenCalled();
  });
  it("rejects an attendance that has not clocked in", async () => {
    vi.mocked(loadAttendanceRecord).mockResolvedValue({ clockInDateTime: "-" } as never);
    const response = await POST(request(), context);
    expect(response.status).toBe(400);
    expect(markAttendanceEducationCompletions).not.toHaveBeenCalled();
  });
});

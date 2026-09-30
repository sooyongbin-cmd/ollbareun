import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireGuardEmployee, GuardAuthenticationError, GuardAuthorizationError } from "@/lib/guard-auth-session";
import { getSystemConfigContent } from "@/lib/system-configs";
import { createLeave } from "@/lib/leave";
import { sendLeaveManagerNotifications } from "@/lib/leave-manager-push-notifications";
import { GET, POST } from "./route";

vi.mock("@/lib/guard-auth-session", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/guard-auth-session")>(),
  requireGuardEmployee: vi.fn(),
}));
vi.mock("@/lib/system-configs", () => ({ getSystemConfigContent: vi.fn() }));
vi.mock("@/lib/leave", () => ({ createLeave: vi.fn() }));
vi.mock("@/lib/leave-manager-push-notifications", () => ({ sendLeaveManagerNotifications: vi.fn() }));

const values = { leaveType: "경조휴가", startDate: "2026-10-01", endDate: "2026-10-02" };
const request = (body: object = values) => new Request("http://localhost/api/guard/leave", {
  method: "POST", body: JSON.stringify(body),
});

describe("guard leave API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireGuardEmployee).mockResolvedValue({ id: "emp-1", name: "홍길동", role: "경비원", is_retired: false });
    vi.mocked(getSystemConfigContent).mockResolvedValue("월차\r\n연차\n경조휴가\n월차\n");
    vi.mocked(createLeave).mockResolvedValue({ id: "leave-1", employee_id: "emp-1", leave_type: values.leaveType, start_date: values.startDate, end_date: values.endDate });
    vi.mocked(sendLeaveManagerNotifications).mockResolvedValue({ successCount: 1, failedCount: 0, unregisteredCount: 0 });
  });

  it("loads only configured leave choices for an authenticated guard", async () => {
    const response = await GET(new Request("http://localhost/api/guard/leave"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(getSystemConfigContent).toHaveBeenCalledWith("leave_code");
    expect(await response.json()).toEqual({ types: ["월차", "연차", "경조휴가"] });
  });

  it("rejects unauthenticated reads and writes before accessing config or saving", async () => {
    vi.mocked(requireGuardEmployee).mockRejectedValue(new GuardAuthenticationError());
    expect((await GET(new Request("http://localhost/api/guard/leave"))).status).toBe(401);
    expect((await POST(request())).status).toBe(401);
    expect(getSystemConfigContent).not.toHaveBeenCalled();
    expect(createLeave).not.toHaveBeenCalled();
  });

  it("saves text for the authenticated employee before sending the notification", async () => {
    const response = await POST(request({ ...values, employeeName: "위조 이름" }));
    expect(response.status).toBe(201);
    expect(createLeave).toHaveBeenCalledWith({ ...values, employeeId: "emp-1" });
    expect(sendLeaveManagerNotifications).toHaveBeenCalledWith({ ...values, id: "leave-1", employeeName: "홍길동" });
    expect(vi.mocked(createLeave).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(sendLeaveManagerNotifications).mock.invocationCallOrder[0]);
  });

  it("checks a claimed employee against the session and rejects impersonation", async () => {
    vi.mocked(requireGuardEmployee).mockRejectedValue(new GuardAuthorizationError());
    expect((await POST(request({ ...values, employeeId: "other" }))).status).toBe(403);
    expect(requireGuardEmployee).toHaveBeenCalledWith(expect.any(Request), "other");
    expect(createLeave).not.toHaveBeenCalled();
  });

  it.each(["1", "등록되지 않은 휴가", ""])("rejects unconfigured type %s", async (leaveType) => {
    expect((await POST(request({ ...values, leaveType }))).status).toBe(400);
    expect(createLeave).not.toHaveBeenCalled();
    expect(sendLeaveManagerNotifications).not.toHaveBeenCalled();
  });

  it("does not send a notification after a save failure", async () => {
    vi.mocked(createLeave).mockRejectedValue(new Error("종료일은 시작일보다 빠를 수 없습니다."));
    expect((await POST(request())).status).toBe(400);
    expect(sendLeaveManagerNotifications).not.toHaveBeenCalled();
  });

  it("returns the saved record with a separate delivery error if push fails", async () => {
    vi.mocked(sendLeaveManagerNotifications).mockRejectedValue(new Error("푸시 실패"));
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ leave: { id: "leave-1" }, delivery: { error: "푸시 실패" } });
    expect(createLeave).toHaveBeenCalledTimes(1);
  });
});

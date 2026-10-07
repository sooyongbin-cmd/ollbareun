import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { POST } from "./route";

vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));
const employeeId = "11111111-1111-4111-8111-111111111111";
const rpc = vi.fn();
function request(workDate = "2026-10-07", employeeIds: unknown = [employeeId]) {
  return new Request("https://example.com/api/notifications/education-reminders/run", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workDate, employeeIds }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-06T15:30:00Z"));
  vi.mocked(getManagerUser).mockResolvedValue({ id: "manager" } as never);
  vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);
  rpc.mockReturnValue({ single: async () => ({ data: { registered_count: 1, delay_minutes: 45 }, error: null }) });
});
afterEach(() => vi.useRealTimers());

it("requires manager authentication", async () => {
  vi.mocked(getManagerUser).mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});
it("rejects dates other than today in Korea without touching jobs", async () => {
  const response = await POST(request("2026-10-06"));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "근무일을 오늘로 조회한 후 교육알림 처리해주세요." });
  expect(rpc).not.toHaveBeenCalled();
});
it("registers only listed employees and returns actual registration count and configured delay", async () => {
  const response = await POST(request(undefined, [employeeId, employeeId]));
  expect(await response.json()).toEqual({ registeredCount: 1, delayMinutes: 45 });
  expect(rpc).toHaveBeenCalledWith("register_daily_education_reminders", {
    p_work_date: "2026-10-07", p_employee_ids: [employeeId],
  });
});
it("keeps an empty list empty", async () => {
  rpc.mockReturnValue({ single: async () => ({ data: { registered_count: 0, delay_minutes: 0 }, error: null }) });
  expect(await (await POST(request(undefined, []))).json()).toEqual({ registeredCount: 0, delayMinutes: 0 });
  expect(rpc).toHaveBeenCalledWith("register_daily_education_reminders", expect.objectContaining({ p_employee_ids: [] }));
});
it("rejects invalid employee IDs", async () => {
  expect((await POST(request(undefined, ["invalid"]))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});
it("reports database failures", async () => {
  rpc.mockReturnValue({ single: async () => ({ data: null, error: { message: "등록 실패" } }) });
  expect(await (await POST(request())).json()).toEqual({ error: "등록 실패" });
});

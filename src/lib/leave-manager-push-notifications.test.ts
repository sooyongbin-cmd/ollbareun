import webpush from "web-push";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import { sendLeaveManagerNotifications } from "./leave-manager-push-notifications";

vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() } }));
vi.mock("./supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));

const leave = { id: "leave-1", employeeName: "홍길동", leaveType: "경조휴가", startDate: "2026-10-01", endDate: "2026-10-03" };
const subscriptions = [
  { user_id: "manager-1", endpoint: "https://push.test/phone", p256dh: "key", auth: "auth" },
  { user_id: "manager-1", endpoint: "https://push.test/tablet", p256dh: "key", auth: "auth" },
];

describe("leave manager notifications", () => {
  let deleteIn: ReturnType<typeof vi.fn>;
  let selectIn: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
    deleteIn = vi.fn().mockResolvedValue({ error: null });
    selectIn = vi.fn().mockResolvedValue({ data: subscriptions, error: null });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn((table: string) => table === "admin_users"
      ? { select: vi.fn().mockReturnValue({ not: vi.fn().mockResolvedValue({ data: [{ user_id: "manager-1" }, { user_id: "manager-2" }], error: null }) }) }
      : { select: vi.fn().mockReturnValue({ in: selectIn }), delete: vi.fn().mockReturnValue({ in: deleteIn }) }),
    } as never);
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("notifies every registered device with the employee, text type, period and leave detail link", async () => {
    expect(await sendLeaveManagerNotifications(leave)).toEqual({ successCount: 2, failedCount: 0, unregisteredCount: 1 });
    expect(selectIn).toHaveBeenCalledWith("user_id", ["manager-1", "manager-2"]);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    const payload = JSON.parse(vi.mocked(webpush.sendNotification).mock.calls[0][1] as string);
    expect(payload).toMatchObject({ title: "새 휴가신청", body: "홍길동 · 경조휴가\n2026-10-01~2026-10-03", data: { url: "/manager/auth?next=%2Fmanager%2Fleave%2Fleave-1" } });
  });

  it("cleans up expired devices while still sending to the remaining device", async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce({ statusCode: 410 });
    expect(await sendLeaveManagerNotifications(leave)).toEqual({ successCount: 1, failedCount: 1, unregisteredCount: 1 });
    expect(deleteIn).toHaveBeenCalledWith("endpoint", [subscriptions[0].endpoint]);
  });

  it("reports unregistered managers without requiring VAPID keys", async () => {
    selectIn.mockResolvedValue({ data: [], error: null });
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect(await sendLeaveManagerNotifications(leave)).toEqual({ successCount: 0, failedCount: 0, unregisteredCount: 2 });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });
});

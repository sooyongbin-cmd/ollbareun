import webpush from "web-push";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  saveManagerPushSubscription,
  sendSpecialRemarkManagerNotifications,
} from "./manager-push-notifications";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("manager push notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
  });

  it("stores a manager subscription using the endpoint as the device identity", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "subscription-1", user_id: "user-1", endpoint: "https://push.test/1" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert }),
    } as never);

    await saveManagerPushSubscription("user-1", {
      endpoint: "https://push.test/1",
      keys: { p256dh: "key", auth: "secret" },
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        endpoint: "https://push.test/1",
        p256dh: "key",
        auth: "secret",
      }),
      { onConflict: "endpoint" },
    );
  });

  it("sends to every registered manager device and links to the report detail", async () => {
    const deleteIn = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === "admin_users") {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({
              data: [{ user_id: "user-1" }, { user_id: "user-2" }],
              error: null,
            }),
          }),
        };
      }
      if (table === "manager_push_subscriptions") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  user_id: "user-1",
                  endpoint: "https://push.test/phone",
                  p256dh: "phone-key",
                  auth: "phone-auth",
                },
                {
                  user_id: "user-1",
                  endpoint: "https://push.test/tablet",
                  p256dh: "tablet-key",
                  auth: "tablet-auth",
                },
              ],
              error: null,
            }),
          }),
          delete: vi.fn().mockReturnValue({ in: deleteIn }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);

    const result = await sendSpecialRemarkManagerNotifications({
      id: "report-1",
      employee_name: "홍길동",
      worksite_name: "본사",
      content: `${"긴 특이사항 ".repeat(30)}마지막`,
    });

    expect(result).toEqual({ successCount: 2, failedCount: 0, unregisteredCount: 1 });
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    const payload = JSON.parse(vi.mocked(webpush.sendNotification).mock.calls[0][1] as string);
    expect(payload.data.url).toBe(
      "/manager/auth?next=%2Fmanager%2Finspection%2Fspecial-remarks%2Freport-1",
    );
    expect(payload.body).toContain("홍길동 · 본사");
    expect(payload.body).toMatch(/…$/);
    expect(payload.icon).toBe("/manager-icon-192.png");
  });

  it("removes expired subscriptions and reports the failed delivery", async () => {
    const deleteIn = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === "admin_users") {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: [{ user_id: "user-1" }], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              {
                user_id: "user-1",
                endpoint: "https://push.test/expired",
                p256dh: "key",
                auth: "auth",
              },
            ],
            error: null,
          }),
        }),
        delete: vi.fn().mockReturnValue({ in: deleteIn }),
      };
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 410 });

    const result = await sendSpecialRemarkManagerNotifications({
      id: "report-1",
      employee_name: "홍길동",
      worksite_name: "본사",
      content: "문이 파손되었습니다.",
    });

    expect(result).toEqual({ successCount: 0, failedCount: 1, unregisteredCount: 0 });
    expect(deleteIn).toHaveBeenCalledWith("endpoint", ["https://push.test/expired"]);
  });

  it("counts managers without subscriptions without requiring VAPID keys", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    const from = vi.fn((table: string) => {
      if (table === "admin_users") {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: [{ user_id: "user-1" }], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    await expect(
      sendSpecialRemarkManagerNotifications({
        id: "report-1",
        employee_name: "홍길동",
        worksite_name: "본사",
        content: "내용",
      }),
    ).resolves.toEqual({ successCount: 0, failedCount: 0, unregisteredCount: 1 });
  });
});

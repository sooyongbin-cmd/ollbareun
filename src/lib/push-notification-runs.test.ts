import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import { listPushNotificationRuns } from "./push-notification-runs";

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function createQuery(data: unknown[] = []) {
  const query = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error: null }),
    eq: vi.fn().mockReturnThis(),
  };

  return query;
}

describe("listPushNotificationRuns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the latest push notification runs with a 100 row limit", async () => {
    const query = createQuery([{ id: "run-1", notification_code: "education_reminder" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue(query) } as never);

    const runs = await listPushNotificationRuns({});

    expect(runs).toEqual([{ id: "run-1", notification_code: "education_reminder" }]);
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(100);
  });

  it("applies status and notification code filters", async () => {
    const query = createQuery([]);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue(query) } as never);

    await listPushNotificationRuns({ status: "sent", notificationCode: "education_reminder" });

    expect(query.eq).toHaveBeenCalledWith("status", "sent");
    expect(query.eq).toHaveBeenCalledWith("notification_code", "education_reminder");
  });

  it("throws a readable error when Supabase fails", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue(query) } as never);

    await expect(listPushNotificationRuns({})).rejects.toThrow("boom");
  });
});

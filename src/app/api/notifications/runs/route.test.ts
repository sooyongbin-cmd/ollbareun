import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPushNotificationRuns } from "@/lib/push-notification-runs";
import { GET } from "./route";

vi.mock("@/lib/push-notification-runs", () => ({
  listPushNotificationRuns: vi.fn(),
}));

describe("GET /api/notifications/runs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns push notification runs", async () => {
    vi.mocked(listPushNotificationRuns).mockResolvedValue([{ id: "run-1" }] as never);

    const response = await GET(new Request("http://localhost/api/notifications/runs"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ runs: [{ id: "run-1" }] });
    expect(listPushNotificationRuns).toHaveBeenCalledWith({
      notificationCode: null,
      status: null,
      limit: 100,
    });
  });

  it("passes query filters to the list function", async () => {
    vi.mocked(listPushNotificationRuns).mockResolvedValue([] as never);

    await GET(new Request("http://localhost/api/notifications/runs?status=sent&notificationCode=education_reminder"));

    expect(listPushNotificationRuns).toHaveBeenCalledWith({
      notificationCode: "education_reminder",
      status: "sent",
      limit: 100,
    });
  });

  it("returns 500 when loading runs fails", async () => {
    vi.mocked(listPushNotificationRuns).mockRejectedValue(new Error("load failed"));

    const response = await GET(new Request("http://localhost/api/notifications/runs"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "load failed" });
  });
});

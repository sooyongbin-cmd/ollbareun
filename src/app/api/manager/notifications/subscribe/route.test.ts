import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUserWithRole } from "@/lib/manager-auth";
import { saveManagerPushSubscription } from "@/lib/manager-push-notifications";
import { POST } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUserWithRole: vi.fn(),
}));

vi.mock("@/lib/manager-push-notifications", () => ({
  saveManagerPushSubscription: vi.fn(),
}));

const validSubscription = {
  endpoint: "https://push.test/manager",
  keys: { p256dh: "key", auth: "secret" },
};

describe("POST /api/manager/notifications/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/manager/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: validSubscription }),
      }),
    );

    expect(response.status).toBe(401);
    expect(saveManagerPushSubscription).not.toHaveBeenCalled();
  });

  it("rejects invalid subscriptions", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({
      user: { id: "user-1" } as never,
      adminUser: { user_id: "user-1", role: "admin" },
    });

    const response = await POST(
      new Request("http://localhost/api/manager/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: { endpoint: "" } }),
      }),
    );

    expect(response.status).toBe(400);
    expect(saveManagerPushSubscription).not.toHaveBeenCalled();
  });

  it("passes the legacy endpoint with the authenticated owner for migration", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({
      user: { id: "user-1" } as never,
      adminUser: { user_id: "user-1", role: "admin" },
    });
    const response = await POST(new Request("http://localhost/api/manager/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify({ subscription: validSubscription, previousEndpoint: "https://push.test/old", userId: "someone-else" }),
    }));
    expect(response.status).toBe(200);
    expect(saveManagerPushSubscription).toHaveBeenCalledWith("user-1", validSubscription, "https://push.test/old");
  });

  it("stores a valid subscription for the authenticated manager", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({
      user: { id: "user-1" } as never,
      adminUser: { user_id: "user-1", role: "admin" },
    });
    vi.mocked(saveManagerPushSubscription).mockResolvedValue({
      id: "subscription-1",
      user_id: "user-1",
    } as never);

    const response = await POST(
      new Request("http://localhost/api/manager/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: validSubscription }),
      }),
    );

    expect(response.status).toBe(200);
    expect(saveManagerPushSubscription).toHaveBeenCalledWith("user-1", validSubscription, undefined);
  });
});

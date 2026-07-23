import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerPushConnect from "./manager-push-connect";

describe("ManagerPushConnect", () => {
  const getSubscription = vi.fn();
  const subscribe = vi.fn();
  const register = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "AQID";
    vi.stubGlobal("PushManager", function PushManager() {});
    vi.stubGlobal("Notification", {
      permission: "granted",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });
    register.mockResolvedValue({
      pushManager: { getSubscription, subscribe },
    });
  });

  it("reuses an existing browser subscription and stores it for the manager", async () => {
    const user = userEvent.setup();
    const subscription = {
      toJSON: () => ({
        endpoint: "https://push.test/manager",
        keys: { p256dh: "key", auth: "secret" },
      }),
    };
    getSubscription.mockResolvedValue(subscription);
    const fetch = vi.fn().mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetch);

    render(<ManagerPushConnect />);
    await user.click(screen.getByRole("button", { name: "푸시 알림 연결" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/manager/notifications/subscribe",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        }),
      );
    });
    expect(subscribe).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "푸시 연결됨" })).toBeInTheDocument();
  });

  it("creates a subscription when the browser has none", async () => {
    const user = userEvent.setup();
    const subscription = {
      toJSON: () => ({
        endpoint: "https://push.test/new",
        keys: { p256dh: "new-key", auth: "new-secret" },
      }),
    };
    getSubscription.mockResolvedValue(null);
    subscribe.mockResolvedValue(subscription);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: true })));

    render(<ManagerPushConnect />);
    await user.click(screen.getByRole("button", { name: "푸시 알림 연결" }));

    await waitFor(() => expect(subscribe).toHaveBeenCalled());
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      }),
    );
  });

  it("shows a retry state when notification permission is denied", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });

    render(<ManagerPushConnect />);
    await user.click(screen.getByRole("button", { name: "푸시 알림 연결" }));

    expect(await screen.findByRole("button", { name: "연결 재시도" })).toBeInTheDocument();
    expect(screen.getByText(/알림 권한을 허용해야/)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });
});

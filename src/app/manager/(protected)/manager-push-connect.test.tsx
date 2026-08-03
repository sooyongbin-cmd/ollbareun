import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
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
    expect(await screen.findByText("이 기기에서 관리자 푸시 알림을 받을 수 있습니다.")).toBeInTheDocument();
  });

  it("creates a subscription when the browser has none", async () => {
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

    await waitFor(() => expect(subscribe).toHaveBeenCalled());
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      }),
    );
  });

  it("shows a permission error when notification permission is denied", async () => {
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });

    render(<ManagerPushConnect />);

    expect(await screen.findByText(/알림 권한을 허용해야/)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("shows an unsupported browser status", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });

    render(<ManagerPushConnect />);

    expect(await screen.findByText("이 브라우저는 푸시 알림을 지원하지 않습니다.")).toBeInTheDocument();
  });

  it("starts only once in React Strict Mode", async () => {
    const subscription = {
      toJSON: () => ({
        endpoint: "https://push.test/strict-mode",
        keys: { p256dh: "key", auth: "secret" },
      }),
    };
    getSubscription.mockResolvedValue(subscription);
    const fetch = vi.fn().mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetch);

    render(
      <StrictMode>
        <ManagerPushConnect />
      </StrictMode>,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(register).toHaveBeenCalledTimes(1);
  });
});

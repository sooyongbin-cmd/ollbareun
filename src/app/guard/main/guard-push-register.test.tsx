import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GuardPushRegister from "./guard-push-register";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const guardSessionStorageKey = "ollbareun.guard.session";
const guardPushRegistrationStorageKey = "ollbareun.guard.pushRegistration";

type MockSubscription = {
  endpoint: string;
  toJSON: () => {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
};

function createSubscription(endpoint: string): MockSubscription {
  return {
    endpoint,
    toJSON: () => ({
      endpoint,
      keys: {
        p256dh: "p256dh-key",
        auth: "auth-secret",
      },
    }),
  };
}

function writeGuardSession(employeeId = "employee-1") {
  window.sessionStorage.setItem(
    guardSessionStorageKey,
    JSON.stringify({
      employee: { id: employeeId },
      sessionLogId: null,
    }),
  );
}

async function runPushRegistration() {
  render(<GuardPushRegister />);

  await act(async () => {
    vi.advanceTimersByTime(1500);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("GuardPushRegister", () => {
  const originalVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  let fetchMock: ReturnType<typeof vi.fn>;
  let registerMock: ReturnType<typeof vi.fn>;
  let getSubscriptionMock: ReturnType<typeof vi.fn>;
  let subscribeMock: ReturnType<typeof vi.fn>;
  let serviceWorkerMessageHandler: ((event: MessageEvent) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
    push.mockReset();
    serviceWorkerMessageHandler = null;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "AQID";

    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    getSubscriptionMock = vi.fn();
    subscribeMock = vi.fn();
    registerMock = vi.fn().mockResolvedValue({
      pushManager: {
        getSubscription: getSubscriptionMock,
        subscribe: subscribeMock,
      },
    });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: registerMock,
        addEventListener: vi.fn((type: string, handler: (event: MessageEvent) => void) => {
          if (type === "message") {
            serviceWorkerMessageHandler = handler;
          }
        }),
        removeEventListener: vi.fn(),
      },
    });
    vi.stubGlobal("PushManager", function PushManager() {});
    vi.stubGlobal("Notification", {
      permission: "granted",
      requestPermission: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    if (originalVapidKey === undefined) {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    } else {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalVapidKey;
    }
  });

  it("saves a newly created browser subscription when no cache exists", async () => {
    writeGuardSession("employee-1");
    const createdSubscription = createSubscription("https://push.example.test/new-endpoint");
    getSubscriptionMock.mockResolvedValue(null);
    subscribeMock.mockResolvedValue(createdSubscription);

    await runPushRegistration();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notifications/subscribe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          employeeId: "employee-1",
          subscription: {
            endpoint: "https://push.example.test/new-endpoint",
            keys: {
              p256dh: "p256dh-key",
              auth: "auth-secret",
            },
          },
        }),
      }),
    );
    expect(subscribeMock).toHaveBeenCalledTimes(1);
  });

  it("skips the server save when the current employee and endpoint were already saved", async () => {
    writeGuardSession("employee-1");
    window.sessionStorage.setItem(
      guardPushRegistrationStorageKey,
      JSON.stringify({
        employeeId: "employee-1",
        endpoint: "https://push.example.test/current-endpoint",
        savedAt: "2026-06-11T00:00:00.000Z",
      }),
    );
    getSubscriptionMock.mockResolvedValue(createSubscription("https://push.example.test/current-endpoint"));

    await runPushRegistration();

    expect(getSubscriptionMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it("saves again when the cached endpoint belongs to a different employee", async () => {
    writeGuardSession("employee-2");
    window.sessionStorage.setItem(
      guardPushRegistrationStorageKey,
      JSON.stringify({
        employeeId: "employee-1",
        endpoint: "https://push.example.test/current-endpoint",
        savedAt: "2026-06-11T00:00:00.000Z",
      }),
    );
    getSubscriptionMock.mockResolvedValue(createSubscription("https://push.example.test/current-endpoint"));

    await runPushRegistration();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notifications/subscribe",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"employeeId":"employee-2"'),
      }),
    );
  });

  it("saves again and refreshes the cache when the endpoint changes", async () => {
    writeGuardSession("employee-1");
    window.sessionStorage.setItem(
      guardPushRegistrationStorageKey,
      JSON.stringify({
        employeeId: "employee-1",
        endpoint: "https://push.example.test/old-endpoint",
        savedAt: "2026-06-11T00:00:00.000Z",
      }),
    );
    getSubscriptionMock.mockResolvedValue(createSubscription("https://push.example.test/new-endpoint"));

    await runPushRegistration();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.sessionStorage.getItem(guardPushRegistrationStorageKey) ?? "{}")).toMatchObject({
      employeeId: "employee-1",
      endpoint: "https://push.example.test/new-endpoint",
    });
  });

  it("ignores malformed cache data and saves the current endpoint", async () => {
    writeGuardSession("employee-1");
    window.sessionStorage.setItem(guardPushRegistrationStorageKey, "{not-json");
    getSubscriptionMock.mockResolvedValue(createSubscription("https://push.example.test/current-endpoint"));

    await runPushRegistration();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("moves to the push payload URL when the in-app reminder modal is confirmed", async () => {
    writeGuardSession("employee-1");
    getSubscriptionMock.mockResolvedValue(createSubscription("https://push.example.test/current-endpoint"));

    const { getByRole } = render(<GuardPushRegister />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      serviceWorkerMessageHandler?.(
        new MessageEvent("message", {
          data: {
            type: "PUSH_NOTIFICATION_RECEIVED",
            title: "안전교육 이수 독려 알림",
            body: "안전교육을 이수해주세요.",
            data: { url: "/guard/main/safety" },
          },
        }),
      );
    });

    fireEvent.click(getByRole("button", { name: "확인" }));

    expect(push).toHaveBeenCalledWith("/guard/main/safety");
  });
});

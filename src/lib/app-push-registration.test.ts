import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppPushRegistration, getLegacyPushEndpoint, registerAppPushWorker } from "./app-push-registration";

function setContainer(container: object) {
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: container });
}

afterEach(() => vi.useRealTimers());

describe("app push registration", () => {
  it("keeps manager and guard subscriptions within their installed app scopes", async () => {
    const register = vi.fn().mockImplementation(async (_url, options) => ({
      scope: new URL(options.scope, window.location.origin).href,
      active: { state: "activated" },
    }));
    setContainer({ register });
    const manager = await registerAppPushWorker("manager");
    const guard = await registerAppPushWorker("guard");
    expect(new URL(manager.scope).pathname).toBe("/manager/");
    expect(new URL(guard.scope).pathname).toBe("/guard/");
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/manager/", updateViaCache: "none" });
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/guard/", updateViaCache: "none" });
  });

  it("waits for the new worker even when the old root worker is ready", async () => {
    const worker = Object.assign(new EventTarget(), { state: "installing" });
    const registration = { installing: worker };
    setContainer({ register: vi.fn().mockResolvedValue(registration), ready: Promise.resolve({ scope: "/" }) });
    let resolved = false;
    const promise = registerAppPushWorker("manager").then(value => { resolved = true; return value; });
    await Promise.resolve();
    expect(resolved).toBe(false);
    worker.state = "activated";
    worker.dispatchEvent(new Event("statechange"));
    expect(await promise).toBe(registration);
  });

  it("rejects failed activation so no subscription is created on a broken worker", async () => {
    const worker = Object.assign(new EventTarget(), { state: "installing" });
    setContainer({ register: vi.fn().mockResolvedValue({ installing: worker }) });
    const promise = registerAppPushWorker("guard");
    const result = expect(promise).rejects.toThrow("활성화에 실패");
    await Promise.resolve();
    worker.state = "redundant";
    worker.dispatchEvent(new Event("statechange"));
    await result;
  });

  it("times out instead of leaving push setup pending forever", async () => {
    vi.useFakeTimers();
    const worker = Object.assign(new EventTarget(), { state: "installing" });
    setContainer({ register: vi.fn().mockResolvedValue({ installing: worker }) });
    const result = expect(registerAppPushWorker("guard")).rejects.toThrow("시간이 초과");
    await vi.advanceTimersByTimeAsync(60_000);
    await result;
  });

  it("reads the legacy endpoint without unsubscribing a shared manager/guard subscription", async () => {
    const unsubscribe = vi.fn();
    const registration = {
      scope: new URL("/", window.location.origin).href,
      pushManager: { getSubscription: vi.fn().mockResolvedValue({ endpoint: "old-device", unsubscribe }) },
    };
    setContainer({ getRegistration: vi.fn().mockResolvedValue(registration) });
    expect(await getLegacyPushEndpoint()).toBe("old-device");
    expect(await getAppPushRegistration("guard")).toBeUndefined();
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});

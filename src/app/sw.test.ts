import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { ModuleKind, transpileModule } from "typescript";

describe("service worker push navigation", () => {
  function clickHarness(openInNewWindow: boolean, windows: unknown[], fetchFails = false) {
    const handlers: Record<string, (event: unknown) => void> = {};
    const openWindow = vi.fn().mockResolvedValue(undefined);
    const fetchPolicy = fetchFails ? vi.fn().mockRejectedValue(new Error("offline")) : vi.fn().mockResolvedValue({ ok: true, json: async () => ({ openInNewWindow }) });
    const source = readFileSync(join(process.cwd(), "src/app/sw.ts"), "utf8");
    const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
    runInNewContext(compiled, {
      exports: {}, console, URL, fetch: fetchPolicy, AbortSignal, setTimeout, clearTimeout,
      MessageChannel: class {
        port1 = { onmessage: null as null | (() => void), close() {} };
        port2 = { postMessage: () => this.port1.onmessage?.(), close() {} };
      },
      require: (name: string) => name === "serwist" ? { Serwist: class { addEventListeners() {} } }
        : name === "@serwist/next/worker" ? { defaultCache: [] } : { notificationBranding: {} },
      self: {
        location: { origin: "https://app.test" },
        registration: { scope: "https://app.test/guard/" },
        addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
        clients: { matchAll: async () => windows, openWindow },
      },
    });
    const click = async (url = "/guard/main/safety") => {
      const pending: Promise<unknown>[] = [];
      handlers.notificationclick({ notification: { close: vi.fn(), data: { url }, title: "교육 알림", body: "근무자 교육 미이수" }, waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
      await Promise.all(pending);
    };
    return { openWindow, click };
  }

  function managerWindow(focusFails = false) {
    return {
      url: "https://app.test/manager/employee/list",
      focused: false, visibilityState: "hidden",
      focus: focusFails ? vi.fn().mockRejectedValue(new Error("closed")) : vi.fn().mockResolvedValue(undefined),
      postMessage: vi.fn((_message: unknown, ports: MessagePort[]) => ports[0].postMessage({ received: true })),
    };
  }

  it("Y opens the worker destination even if the manager is running", async () => {
    const manager = managerWindow();
    const harness = clickHarness(true, [manager]);
    await harness.click();
    expect(harness.openWindow).toHaveBeenCalledWith("https://app.test/guard/main/safety");
    expect(manager.focus).not.toHaveBeenCalled();
  });

  it.each([false, true])("N focuses and delivers to a manager at a different URL (offline=%s)", async (offline) => {
    const manager = managerWindow();
    const harness = clickHarness(false, [manager], offline);
    await harness.click();
    expect(manager.focus).toHaveBeenCalledOnce();
    expect(manager.postMessage).toHaveBeenCalledWith({ type: "PUSH_NOTIFICATION_CLICKED", url: "https://app.test/guard/main/safety", title: "교육 알림", body: "근무자 교육 미이수" }, expect.anything());
    expect(harness.openWindow).not.toHaveBeenCalled();
  });

  it("N opens a new window if only a guard or manager login window is available", async () => {
    const manager = { ...managerWindow(), url: "https://app.test/manager/auth" };
    const harness = clickHarness(false, [manager, { ...managerWindow(), url: "https://app.test/guard/main" }]);
    await harness.click();
    expect(harness.openWindow).toHaveBeenCalledOnce();
    expect(manager.focus).not.toHaveBeenCalled();
  });

  it("falls back when the manager cannot be focused", async () => {
    const harness = clickHarness(false, [managerWindow(true)]);
    await harness.click();
    expect(harness.openWindow).toHaveBeenCalledOnce();
  });

  it("falls back if the manager has not installed the message listener yet", async () => {
    const manager = { ...managerWindow(), postMessage: vi.fn() };
    const harness = clickHarness(false, [manager]);
    await harness.click();
    expect(harness.openWindow).toHaveBeenCalledOnce();
  });

  it("does not open off-site destinations", async () => {
    const harness = clickHarness(true, []);
    await harness.click("https://external.test/");
    expect(harness.openWindow).not.toHaveBeenCalled();
  });

  it("uses the notification payload URL when a push notification is clicked", () => {
    const source = readFileSync(join(process.cwd(), "src/app/sw.ts"), "utf8");

    expect(source).toContain('event.notification.data?.url || "/guard/main"');
    expect(source).toContain("new URL(notificationUrl, self.location.origin).href");
  });

  it("only forwards foreground notifications to windows in the receiving app scope", async () => {
    const managerMessage = vi.fn();
    const guardMessage = vi.fn();
    const hiddenMessage = vi.fn();
    const handlers: Record<string, (event: unknown) => void> = {};
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const source = readFileSync(join(process.cwd(), "src/app/sw.ts"), "utf8");
    const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
    runInNewContext(compiled, {
      exports: {}, console,
      require: (name: string) => name === "serwist"
        ? { Serwist: class { addEventListeners() {} } }
        : name === "@serwist/next/worker"
          ? { defaultCache: [] }
          : { notificationBranding: { icon: "/icon.png", badge: "/badge.png" } },
      self: {
        registration: { scope: "https://app.test/manager/", showNotification },
        addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
        clients: { matchAll: async () => [
          { url: "https://app.test/manager/leave", visibilityState: "visible", postMessage: managerMessage },
          { url: "https://app.test/guard/main", visibilityState: "visible", postMessage: guardMessage },
          { url: "https://app.test/manager/leave", visibilityState: "hidden", postMessage: hiddenMessage },
        ] },
      },
    });
    const pending: Promise<unknown>[] = [];
    handlers.push({ data: { json: () => ({ title: "새 휴가신청" }) }, waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
    await Promise.all(pending);
    expect(showNotification).toHaveBeenCalledOnce();
    expect(managerMessage).toHaveBeenCalledOnce();
    expect(guardMessage).not.toHaveBeenCalled();
    expect(hiddenMessage).not.toHaveBeenCalled();
  });
});

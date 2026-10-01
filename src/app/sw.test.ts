import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { ModuleKind, transpileModule } from "typescript";

describe("service worker push navigation", () => {
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

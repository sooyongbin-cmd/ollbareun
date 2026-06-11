import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("service worker push navigation", () => {
  it("uses the notification payload URL when a push notification is clicked", () => {
    const source = readFileSync(join(process.cwd(), "src/app/sw.ts"), "utf8");

    expect(source).toContain('event.notification.data?.url || "/guard/main"');
    expect(source).toContain("new URL(notificationUrl, self.location.origin).href");
  });
});

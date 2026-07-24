import { describe, expect, it } from "vitest";
import { guardPwaManifest, legacyPwaManifest, managerPwaManifest } from "./pwa-manifests";

describe("PWA manifests", () => {
  it("keeps guard and manager as separate installable apps", () => {
    const guard = guardPwaManifest();
    const manager = managerPwaManifest();

    expect(guard).toMatchObject({
      name: "올바름 현장 근로자",
      id: "/guard",
      start_url: "/guard",
      scope: "/guard",
      display: "standalone",
      orientation: "portrait",
    });
    expect(manager).toMatchObject({
      name: "올바름 관리자",
      id: "/manager",
      start_url: "/manager",
      scope: "/manager",
      display: "standalone",
    });
    expect(manager).not.toHaveProperty("orientation");
    expect(guard.icons).not.toEqual(manager.icons);
  });

  it("limits the legacy installed app to the guard scope", () => {
    expect(legacyPwaManifest()).toMatchObject({
      id: "https://ollbareun.vercel.app/manager",
      start_url: "/guard",
      scope: "/guard",
    });
  });
});

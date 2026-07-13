import { describe, expect, it } from "vitest";
import { GET as getGuardManifest } from "./guard/manifest.webmanifest/route";
import { GET as getLegacyManifest } from "./manifest.webmanifest/route";
import { GET as getManagerManifest } from "./manager/manifest.webmanifest/route";

describe("PWA manifest routes", () => {
  it.each([
    ["guard", getGuardManifest, "/guard"],
    ["manager", getManagerManifest, "/manager"],
    ["legacy", getLegacyManifest, "/guard"],
  ])("serves the %s manifest with the correct MIME type", async (_name, getManifest, scope) => {
    const response = getManifest();

    expect(response.headers.get("content-type")).toBe("application/manifest+json; charset=utf-8");
    await expect(response.json()).resolves.toMatchObject({ scope });
  });
});

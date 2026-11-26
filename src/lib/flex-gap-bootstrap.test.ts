import { afterEach, describe, expect, it, vi } from "vitest";
import { flexGapBootstrap } from "./flex-gap-bootstrap";

function runProbe(supported: boolean, app: boolean) {
  const script = document.createElement("script");
  if (app) script.setAttribute("data-app-layout", "");
  vi.spyOn(document, "currentScript", "get").mockReturnValue(script);
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(supported ? 1 : 0);
  window.eval(flexGapBootstrap);
}

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("data-legacy-flex-gap");
  document.head.querySelectorAll('[src^="/legacy-flex-"], [href="/legacy-flex-layout.css"]').forEach(el => el.remove());
});

describe("Flexbox gap compatibility", () => {
  it("uses native layout without requesting compatibility assets on modern browsers", () => {
    runProbe(true, true);
    expect(document.documentElement.hasAttribute("data-legacy-flex-gap")).toBe(false);
    expect(document.querySelector('[src^="/legacy-flex-"], [href="/legacy-flex-layout.css"]')).toBeNull();
  });

  it.each([true, false])("loads the fallback once when flex gap is missing (app=%s)", app => {
    runProbe(false, app);
    window.eval(flexGapBootstrap);
    expect(document.documentElement.hasAttribute("data-legacy-flex-gap")).toBe(true);
    expect(document.querySelectorAll('link[href="/legacy-flex-layout.css"]')).toHaveLength(app ? 1 : 0);
    expect(Array.from(document.querySelectorAll('script[src^="/legacy-flex-"]'), el => el.getAttribute("src")))
      .toEqual(["/legacy-flex-wrap.js", "/legacy-flex-gap.js"]);
  });
});

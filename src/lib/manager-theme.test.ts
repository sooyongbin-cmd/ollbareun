import { describe, expect, it } from "vitest";
import { normalizeManagerTheme } from "./manager-theme";

describe("normalizeManagerTheme", () => {
  it.each(["light", "dark", "system"] as const)("accepts %s", (theme) => {
    expect(normalizeManagerTheme(theme)).toBe(theme);
  });

  it("normalizes whitespace and letter case", () => {
    expect(normalizeManagerTheme("  DARK  ")).toBe("dark");
  });

  it.each([undefined, null, "", "unknown", 1])(
    "falls back to system for %s",
    (value) => {
      expect(normalizeManagerTheme(value)).toBe("system");
    },
  );
});

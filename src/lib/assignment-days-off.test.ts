import { describe, expect, it } from "vitest";
import { requireDayOffDate } from "./assignment-days-off";

describe("assignment days off validation", () => {
  it("accepts a valid ISO date", () => {
    expect(requireDayOffDate("2026-05-22")).toBe("2026-05-22");
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => requireDayOffDate("2026/05/22")).toThrow("휴무일 형식이 올바르지 않습니다.");
    expect(() => requireDayOffDate("2026-02-31")).toThrow("휴무일 형식이 올바르지 않습니다.");
  });
});

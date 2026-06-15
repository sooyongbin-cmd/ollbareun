import { describe, expect, it } from "vitest";
import {
  formatKstDate,
  formatKstTime,
  parseDailyPushMessageTimes,
  shouldRunDailyPushMessage,
} from "./education-reminder-schedule";

describe("education reminder schedule", () => {
  it("parses comma separated HH:mm times", () => {
    expect(parseDailyPushMessageTimes("09:10, 09:20, 09:30, 15:30")).toEqual([
      "09:10",
      "09:20",
      "09:30",
      "15:30",
    ]);
  });

  it("ignores blank and malformed entries", () => {
    expect(parseDailyPushMessageTimes("09:10, nope, , 25:99, 15:30")).toEqual(["09:10", "15:30"]);
  });

  it("matches the current KST HH:mm against configured times", () => {
    expect(shouldRunDailyPushMessage("09:10, 09:20, 09:30", "09:20")).toBe(true);
    expect(shouldRunDailyPushMessage("09:10, 09:20, 09:30", "09:21")).toBe(false);
  });

  it("formats a UTC date as KST date and time", () => {
    const date = new Date("2026-06-15T00:10:05.000Z");

    expect(formatKstDate(date)).toBe("2026-06-15");
    expect(formatKstTime(date)).toBe("09:10");
  });
});

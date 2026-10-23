import { expect, it } from "vitest";
import { formatDateTimeSegment } from "./attendance-time-display";

it("shows only the day for different dates, including month and year boundaries", () => {
  expect(formatDateTimeSegment("2026-10-03 08:00", "2026-10-02")).toEqual({ text: "3일 08:00", differsFromQueryDate: true });
  expect(formatDateTimeSegment("2026-11-01 08:00", "2026-10-31").text).toBe("1일 08:00");
  expect(formatDateTimeSegment("2027-01-01 08:00", "2026-12-31").text).toBe("1일 08:00");
  expect(formatDateTimeSegment("08:00", "2026-10-02", "2026-10-03").text).toBe("3일 08:00");
});
it("preserves same-date time-only values and missing timestamps", () => {
  expect(formatDateTimeSegment("2026-10-02 18:00", "2026-10-02")).toEqual({ text: "18:00", differsFromQueryDate: false });
  expect(formatDateTimeSegment(null, "2026-10-02").text).toBe("-");
  expect(formatDateTimeSegment("-", "2026-10-02").text).toBe("-");
});

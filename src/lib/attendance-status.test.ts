import { describe, expect, it } from "vitest";
import { deriveAttendanceStatuses } from "./attendance-status";

describe("deriveAttendanceStatuses", () => {
  it("marks clock-in as normal or late", () => {
    expect(deriveAttendanceStatuses({ scheduledIn: "2026-09-01T00:00:00.000Z", workIn: "2026-09-01T00:00:00.000Z" })).toEqual({ intime_status: "2", outtime_status: "0" });
    expect(deriveAttendanceStatuses({ scheduledIn: "2026-09-01T00:00:00.000Z", workIn: "2026-09-01T00:01:00.000Z" })).toEqual({ intime_status: "1", outtime_status: "0" });
  });

  it("keeps clock-in status and records the checkout status separately", () => {
    expect(deriveAttendanceStatuses({ workIn: "2026-09-01T00:00:00.000Z", workOut: "2026-09-01T10:00:00.000Z", scheduledOut: "2026-09-01T09:00:00.000Z" })).toEqual({ intime_status: "2", outtime_status: "2" });
    expect(deriveAttendanceStatuses({ workIn: "2026-09-01T00:00:00.000Z", workOut: "2026-09-01T08:00:00.000Z", scheduledOut: "2026-09-01T09:00:00.000Z" })).toEqual({ intime_status: "2", outtime_status: "1" });
    expect(deriveAttendanceStatuses({ workIn: "2026-09-01T00:00:00.000Z" })).toEqual({ intime_status: "2", outtime_status: "0" });
  });
});

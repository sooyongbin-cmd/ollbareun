import { describe, expect, it } from "vitest";
import {
  formatGuardWorkDate,
  formatGuardWorkTime,
  getGuardWorkAction,
  selectGuardWorkSchedule,
  type GuardWorkSchedule,
} from "./guard-work-schedule";

function schedule(overrides: Partial<GuardWorkSchedule>): GuardWorkSchedule {
  return {
    id: "schedule-1",
    employee_id: "employee-1",
    worksite_id: "site-1",
    work_date: "2026-09-30",
    intime: "2026-09-30T01:00:00+09:00",
    outtime: "2026-09-30T09:00:00+09:00",
    work_intime: null,
    work_outtime: null,
    ...overrides,
  };
}

describe("guard work schedule selection", () => {
  it("selects the earliest work date that has not been clocked out", () => {
    const previous = schedule({ work_date: "2026-09-29", work_intime: "2026-09-29T22:00:00+09:00" });
    const current = schedule({ id: "schedule-2", work_date: "2026-09-30" });

    expect(selectGuardWorkSchedule([current, previous])).toEqual(previous);
  });

  it("selects the last work date when every record is clocked out", () => {
    const previous = schedule({ work_date: "2026-09-29", work_outtime: "2026-09-30T01:00:00+09:00" });
    const last = schedule({ id: "schedule-2", work_outtime: "2026-09-30T18:00:00+09:00" });

    expect(selectGuardWorkSchedule([last, previous])).toEqual(last);
    expect(getGuardWorkAction(last)).toBe("complete");
  });

  it.each([
    [schedule({ work_intime: null, work_outtime: null }), "clock-in"],
    [schedule({ work_intime: "2026-09-30T01:00:00+09:00", work_outtime: null }), "clock-out"],
    [schedule({ work_intime: "2026-09-30T01:00:00+09:00", work_outtime: "2026-09-30T09:00:00+09:00" }), "complete"],
  ] as const)("uses the selected work date attendance state", (selected, action) => {
    expect(getGuardWorkAction(selected)).toBe(action);
  });

  it("formats the scheduled work date and times in Seoul", () => {
    expect(formatGuardWorkDate("2026-09-30")).toBe("09/30 (수)");
    expect(formatGuardWorkTime("2026-09-30T01:00:00.000Z")).toBe("10:00 AM");
    expect(formatGuardWorkTime("2026-09-30T21:00:00.000Z")).toBe("6:00 AM");
  });
});

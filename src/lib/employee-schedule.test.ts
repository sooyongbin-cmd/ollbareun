import { describe, expect, it } from "vitest";
import { employeeScheduleRules, isScheduleDayOff, setScheduleDayOff, scheduleSummary, validateScheduleRules } from "./employee-schedule";

describe("employee schedule rules", () => {
  it("converts the legacy combined holiday switch without changing weekdays", () => {
    expect(employeeScheduleRules({ has_weekend: true }).map(rule => rule.day_type)).toEqual(["saturday", "sunday", "holiday"]);
    expect(employeeScheduleRules({ has_weekend: false })).toEqual([]);
    expect(employeeScheduleRules({ has_weekend: true, schedule_rules_enabled: true, schedule_rules: [] })).toEqual([]);
  });
  it("accepts Saturday overrides and next-day holiday shifts", () => {
    expect(validateScheduleRules([{ day_type: "saturday", is_working_day: true, in_time: "08:00:00", out_time: 1020 }], "0")[0].in_time).toBe("08:00");
    expect(validateScheduleRules([{ day_type: "holiday", is_working_day: true, in_time: "16:00", out_time: 1800 }], "2")[0].out_time).toBe(1800);
  });
  it("rejects duplicate, malformed and reversed schedules", () => {
    const rule = { day_type: "saturday", is_working_day: true, in_time: "08:00", out_time: 1020 };
    expect(() => validateScheduleRules([rule, rule], "0")).toThrow();
    for (const invalid of [{ ...rule, day_type: "not-a-day" }, { ...rule, in_time: "25:00" }, { ...rule, out_time: 3000 }, { ...rule, out_time: 480 }, { ...rule, out_time: null }, { ...rule, out_time: 1800 }]) {
      expect(() => validateScheduleRules([invalid], "0")).toThrow();
    }
  });
  it("supports multiple weekday days off and clearing one independently", () => {
    let rules = setScheduleDayOff([], "monday", true, "07:00", "18:00");
    rules = setScheduleDayOff(rules, "tuesday", true, "07:00", "18:00");
    expect(validateScheduleRules(rules, "0")).toHaveLength(2);
    expect(isScheduleDayOff(rules, "monday")).toBe(true);
    expect(isScheduleDayOff(rules, "tuesday")).toBe(true);
    rules = setScheduleDayOff(rules, "monday", false, "07:00", "18:00");
    expect(isScheduleDayOff(rules, "monday")).toBe(false);
    expect(isScheduleDayOff(rules, "tuesday")).toBe(true);
    expect(scheduleSummary({ in_time: "07:00", schedule_rules_enabled: true, schedule_rules: rules })).toContain("화요일 휴무");
  });
  it("allows one workday within a legacy all-weekdays-off rule", () => {
    const rules = setScheduleDayOff([{ day_type: "weekday", is_working_day: false, in_time: null, out_time: null }], "monday", false, "07:00", "18:00");
    expect(isScheduleDayOff(rules, "monday")).toBe(false);
    expect(isScheduleDayOff(rules, "tuesday")).toBe(true);
    expect(validateScheduleRules(rules, "0")).toHaveLength(2);
  });
  it("summarizes base hours and exceptions separately", () => {
    expect(scheduleSummary({ in_time: "07:00", schedule_rules_enabled: true, schedule_rules: [
      { day_type: "saturday", is_working_day: true, in_time: "08:00", out_time: 1020 },
      { day_type: "sunday", is_working_day: false, in_time: null, out_time: null },
    ] })).toBe("평일 07:00 · 토요일 08:00 · 일요일 휴무 · 공휴일 07:00");
  });
});

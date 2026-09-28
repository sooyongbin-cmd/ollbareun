import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EmployeeScheduleFields } from "./employee-schedule-fields";
import { legacyScheduleRules, type ScheduleRule } from "@/lib/employee-schedule";

function Form() {
  const [rules, setRules] = useState<ScheduleRule[]>(legacyScheduleRules(true));
  return <><EmployeeScheduleFields rules={rules} onChange={setRules} inTime="07:00" outTime="18:00" workStyle="0" /><output data-testid="rules">{JSON.stringify(rules)}</output></>;
}

describe("day-specific schedule fields", () => {
  it("edits Saturday hours and removes an override when returning to base hours", async () => {
    const user = userEvent.setup();
    render(<Form />);
    await user.selectOptions(screen.getByLabelText("토요일 적용 방식"), "custom");
    fireEvent.change(screen.getByLabelText("토요일 출근"), { target: { value: "08:00" } });
    await user.clear(screen.getByLabelText("토요일 퇴근"));
    await user.type(screen.getByLabelText("토요일 퇴근"), "17:00");
    expect(JSON.parse(screen.getByTestId("rules").textContent!)).toContainEqual({ day_type: "saturday", is_working_day: true, in_time: "08:00", out_time: 1020 });
    await user.selectOptions(screen.getByLabelText("토요일 적용 방식"), "default");
    expect(screen.queryByLabelText("토요일 출근")).not.toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("rules").textContent!).some((rule: ScheduleRule) => rule.day_type === "saturday")).toBe(false);
  });
  it("clears time values when a day changes to off", async () => {
    const user = userEvent.setup();
    render(<Form />);
    await user.selectOptions(screen.getByLabelText("공휴일 적용 방식"), "custom");
    await user.selectOptions(screen.getByLabelText("공휴일 적용 방식"), "off");
    expect(JSON.parse(screen.getByTestId("rules").textContent!)).toContainEqual({ day_type: "holiday", is_working_day: false, in_time: null, out_time: null });
  });
});

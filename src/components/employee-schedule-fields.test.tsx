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
  it("selects Monday and Tuesday independently and keeps the selected days after rerender", async () => {
    const user = userEvent.setup();
    render(<Form />);
    await user.click(screen.getByRole("checkbox", { name: "월요일 휴무" }));
    await user.click(screen.getByRole("checkbox", { name: "화요일 휴무" }));
    expect(screen.getByRole("checkbox", { name: "월요일 휴무" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "화요일 휴무" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "수요일 휴무" })).not.toBeChecked();
    const rules = JSON.parse(screen.getByTestId("rules").textContent!);
    expect(rules).toContainEqual({ day_type: "monday", is_working_day: false, in_time: null, out_time: null });
    expect(rules).toContainEqual({ day_type: "tuesday", is_working_day: false, in_time: null, out_time: null });
    await user.click(screen.getByRole("checkbox", { name: "월요일 휴무" }));
    expect(screen.getByRole("checkbox", { name: "월요일 휴무" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "화요일 휴무" })).toBeChecked();
  });

  it("synchronizes weekend and public holiday checkboxes with the time settings", async () => {
    const user = userEvent.setup();
    render(<Form />);
    await user.click(screen.getByRole("checkbox", { name: "공휴일 휴무" }));
    expect(screen.getByLabelText("공휴일 적용 방식")).toHaveValue("default");
    await user.selectOptions(screen.getByLabelText("토요일 적용 방식"), "custom");
    expect(screen.getByRole("checkbox", { name: "토요일 휴무" })).not.toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "토요일 휴무" }));
    expect(screen.getByLabelText("토요일 적용 방식")).toHaveValue("off");
    expect(screen.queryByLabelText("토요일 출근")).not.toBeInTheDocument();
  });

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

import { render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import EducationAttendancePage from "./education-attendance-page";
afterEach(() => vi.unstubAllGlobals());
it("shows subject totals, O for all complete, fractions otherwise and a dash for no subjects", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    resourceCounts: { daily: 2, monthly: 0, quarterly: 1, semiannual: 0, other: 2 },
    rows: [{ employeeId: "e", employeeName: "홍길동", daily: 1, monthly: 0, quarterly: 1, semiannual: 0, other: 0 }],
  })));
  render(<EducationAttendancePage mode="daily" />);
  const name = await screen.findByText("홍길동", { selector: "td" });
  const row = name.closest("tr")!;
  expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["홍길동", "1/2", "-", "O", "-", "0/2"]);
  for (const title of ["일일(2)", "월별(0)", "분기(1)", "반기(0)", "기타(2)"]) {
    expect(screen.getByRole("columnheader", { name: title })).toBeInTheDocument();
  }
});

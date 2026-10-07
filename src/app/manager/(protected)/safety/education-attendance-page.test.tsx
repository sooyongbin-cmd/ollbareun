import { render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import EducationAttendancePage from "./education-attendance-page";
import userEvent from "@testing-library/user-event";
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

it("shows monthly subject totals, ratios, other and retains the completion action", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    resourceCounts: { daily: 0, monthly: 0, quarterly: 1, semiannual: 0, other: 2 },
    summaryRows: [{ employeeId: "e", employeeName: "홍길동", monthly: 0, quarterly: 1, semiannual: 0, other: 1 }], detailRows: [],
  })));
  render(<EducationAttendancePage mode="monthly" />);
  const name = await screen.findByText("홍길동", { selector: "td" });
  expect(within(name.closest("tr")!).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["홍길동", "-", "O", "-", "1/2"]);
  expect(screen.getByRole("columnheader", { name: "기타(2)" })).toBeInTheDocument();
  expect(screen.getByText("2/3 67%")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "홍길동 근무자 기타 교육 미이수 처리" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("기타 교육을 이수처리할까요?");
  await user.click(screen.getByRole("button", { name: "이수처리" }));
  await screen.findByText("처리되었습니다.");
  await user.click(screen.getByRole("button", { name: "확인" }));
  expect(within(name.closest("tr")!).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["홍길동", "-", "O", "-", "O"]);
  expect(screen.getByText("3/3 100%")).toBeInTheDocument();
});

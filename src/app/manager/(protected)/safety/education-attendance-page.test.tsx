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
  expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["홍길동", "1/2", "-", "1/1", "-", "0/2"]);
  for (const title of ["일일(2)", "월별(0)", "분기(1)", "반기(0)", "기타(2)"]) {
    expect(screen.getByRole("columnheader", { name: title })).toBeInTheDocument();
  }
});

it("renders daily subject columns and completes only the selected subject on its attendance date", async () => {
  const user = userEvent.setup();
  const month = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date());
  const workDate = `${month}-03`;
  const fetchMock = vi.fn(async () => Response.json({
    resourceCounts: { daily: 0, monthly: 0, quarterly: 0, semiannual: 0, other: 0 }, summaryRows: [],
    dailySubjects: [{ id: "d1", title: "일일1" }, { id: "d2", title: "일일2" }, { id: "d3", title: "일일3" }],
    detailRows: [{ employeeId: "e", employeeName: "홍길동", workDate, subjects: [{ resourceId: "d1", isCompleted: true }, { resourceId: "d2", isCompleted: false }, { resourceId: "d3", isCompleted: null }] }],
  }));
  vi.stubGlobal("fetch", fetchMock);
  render(<EducationAttendancePage mode="monthly" />);
  const name = await screen.findByText("홍길동", { selector: "td" });
  const row = name.closest("tr")!;
  expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["홍길동", workDate, "O", "X", "-"]);
  expect(screen.getByRole("columnheader", { name: "일일1" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "일일2" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: `홍길동 근무자 일일2 미이수 처리 (${workDate})` }));
  await user.click(screen.getByRole("button", { name: "이수처리" }));
  await screen.findByText("처리되었습니다.");
  expect(fetchMock).toHaveBeenCalledWith("/api/manager/safety-education/complete", expect.objectContaining({ body: JSON.stringify({ employeeId: "e", educationType: "daily", yearMonth: month, workDate, resourceId: "d2" }) }));
  await user.click(screen.getByRole("button", { name: "확인" }));
  expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["홍길동", workDate, "O", "O", "-"]);
});

it("shows monthly subject totals, ratios, other and retains the completion action", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    resourceCounts: { daily: 2, monthly: 0, quarterly: 1, semiannual: 0, other: 2 },
    summaryRows: [{ employeeId: "e", employeeName: "홍길동", monthly: 0, quarterly: 1, semiannual: 0, other: 1 }],
    detailRows: [
      { employeeId: "e", employeeName: "", workDate: "2026-10-01", subjects: [{ resourceId: "d1", isCompleted: true }, { resourceId: "d2", isCompleted: null }] },
      { employeeId: "e", employeeName: "", workDate: "2026-10-02", subjects: [{ resourceId: "d1", isCompleted: false }, { resourceId: "d2", isCompleted: false }] },
    ],
  })));
  render(<EducationAttendancePage mode="monthly" />);
  const name = await screen.findByText("홍길동", { selector: "td" });
  expect(within(name.closest("tr")!).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["홍길동", "1/3", "-", "1/1", "-", "1/2"]);
  expect(screen.getByRole("columnheader", { name: "일일(2)" })).toBeInTheDocument();
  expect(screen.getByText("1/3")).toHaveClass("text-destructive");
  expect(screen.getByRole("columnheader", { name: "기타(2)" })).toBeInTheDocument();
  expect(screen.getByText("3/6 50%")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "홍길동 근무자 기타 교육 미이수 처리" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("기타 교육을 이수처리할까요?");
  await user.click(screen.getByRole("button", { name: "이수처리" }));
  await screen.findByText("처리되었습니다.");
  await user.click(screen.getByRole("button", { name: "확인" }));
  expect(within(name.closest("tr")!).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["홍길동", "1/3", "-", "1/1", "-", "2/2"]);
  expect(screen.getByText("2/2")).not.toHaveClass("text-destructive");
  expect(screen.getByText("4/6 67%")).toBeInTheDocument();
});

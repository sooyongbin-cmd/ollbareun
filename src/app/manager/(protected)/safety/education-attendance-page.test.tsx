import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import EducationAttendancePage from "./education-attendance-page";
import userEvent from "@testing-library/user-event";
afterEach(() => vi.unstubAllGlobals());

it("shows actual work dates after names and highlights only dates different from today", async () => {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const yesterday = new Date(new Date(`${today}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    resourceCounts: { daily: 0, monthly: 0, quarterly: 0, semiannual: 0, other: 0 },
    rows: [
      { employeeId: "e1", employeeName: "심명호", employeeRole: "경비원", workStyle: "격일근무", workDate: yesterday },
      { employeeId: "e2", employeeName: "김철수", employeeRole: "미화원", workStyle: "일반근무", workDate: today },
    ],
  })));
  render(<EducationAttendancePage mode="daily" />);
  await screen.findByText("심명호 (경비,격일)");
  expect(screen.getAllByRole("columnheader").slice(0, 2).map((cell) => cell.textContent)).toEqual(["이름", "출근일"]);
  expect(screen.getByText(yesterday)).toHaveClass("text-yellow-500");
  expect(screen.getByText(today)).not.toHaveClass("text-yellow-500");
  expect(screen.getByText("김철수 (미화,일반)")).toBeInTheDocument();
});

it("moves education reminders to the daily page and updates labels", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ rows: [], summaryRows: [], detailRows: [] })));
  const daily = render(<EducationAttendancePage mode="daily" />);
  expect(screen.getByRole("heading", { name: "일일교육이수" })).toBeInTheDocument();
  expect(screen.getByLabelText("근무일")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "교육알림" })).toBeInTheDocument();
  daily.unmount();
  render(<EducationAttendancePage mode="monthly" />);
  expect(screen.queryByRole("button", { name: "교육알림" })).not.toBeInTheDocument();
});

it("rejects a past work date in a modal without registering reminders", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ rows: [] }));
  vi.stubGlobal("fetch", fetchMock);
  render(<EducationAttendancePage mode="daily" />);
  fireEvent.change(screen.getByLabelText("근무일"), { target: { value: "2020-01-01" } });
  await user.click(await screen.findByRole("button", { name: "교육알림" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("근무일을 오늘로 조회한 후 교육알림 처리해주세요.");
  expect(fetchMock.mock.calls.every(([url]) => !String(url).endsWith("/run"))).toBe(true);
});

it("registers the filtered list and shows count and delay from the server", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async (url: RequestInfo | URL) => String(url).endsWith("/run")
    ? Response.json({ registeredCount: 1, delayMinutes: 7 })
    : Response.json({ resourceCounts: { daily: 1, monthly: 0, quarterly: 0, semiannual: 0, other: 0 }, rows: [
      { employeeId: "e1", employeeName: "홍길동", employeeRole: "경비원", workStyle: "격일근무", workDate: "2026-10-07", daily: 0, monthly: 0, quarterly: 0, semiannual: 0, other: 0 },
      { employeeId: "e2", employeeName: "김철수", employeeRole: "미화원", workStyle: "일반근무", workDate: "2026-10-07", daily: 0, monthly: 0, quarterly: 0, semiannual: 0, other: 0 },
    ] }));
  vi.stubGlobal("fetch", fetchMock);
  render(<EducationAttendancePage mode="daily" />);
  await screen.findByText("홍길동 (경비,격일)", { selector: "td" });
  await user.type(screen.getByLabelText("이름"), "홍길동");
  await user.click(screen.getByRole("button", { name: "교육알림" }));
  expect(await screen.findByText("1건 알림등록되었습니다. 7분 후에 알림이 전송될 예정입니다.")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/notifications/education-reminders/run", expect.objectContaining({
    method: "POST", body: JSON.stringify({ workDate: (screen.getByLabelText("근무일") as HTMLInputElement).value, employeeIds: ["e1"] }),
  }));
});
it("shows subject totals, O for all complete, fractions otherwise and a dash for no subjects", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    resourceCounts: { daily: 2, monthly: 0, quarterly: 1, semiannual: 0, other: 2 },
    rows: [{ employeeId: "e", employeeName: "홍길동", employeeRole: "경비원", workStyle: "격일근무", workDate: "2026-10-07", daily: 1, monthly: 0, quarterly: 1, semiannual: 0, other: 0 }],
  })));
  render(<EducationAttendancePage mode="daily" />);
  const name = await screen.findByText("홍길동 (경비,격일)", { selector: "td" });
  const row = name.closest("tr")!;
  expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["홍길동 (경비,격일)", "2026-10-07", "1/2", "-", "1/1", "-", "0/2"]);
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

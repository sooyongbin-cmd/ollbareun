import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import EducationHistoryTable from "./education-history-table";
import type { EducationDayRow } from "@/lib/education-completions";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  push.mockReset();
});

it("groups attendance dates by employee, orders periods before daily records, and preserves detail links", async () => {
  window.history.replaceState({}, "", "/manager/safety/completions?from=2026-09-01&to=2026-09-30");
  const item = (id: string, education_type: EducationDayRow["items"][number]["education_type"]) => ({
    id, resource_id: id, resource_title: id, education_type, is_completed: false, completed_at: null,
  });
  const rows: EducationDayRow[] = [
    { employee_id: "yoon", employee_name: "윤정숙", education_date: "2026-09-29", items: [item("daily-29", "daily"), item("quarter", "quarterly")] },
    { employee_id: "kim", employee_name: "김민수", education_date: "2026-09-29", items: [item("kim-daily", "daily")] },
    { employee_id: "yoon", employee_name: "윤정숙", education_date: "2026-09-28", items: [item("daily-28", "daily"), item("month", "monthly"), item("half", "semiannual")] },
    { employee_id: "another-yoon", employee_name: "윤정숙", education_date: "2026-09-28", items: [] },
  ];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url === "/api/bootstrap"
    ? { employees: [] }
    : { rows, total: 3, page: 1, pageSize: 50 })));
  render(<EducationHistoryTable />);
  expect(await screen.findByText("조회 결과 3명")).toBeInTheDocument();
  const tableRows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
  expect(tableRows).toHaveLength(3);
  expect(tableRows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["김민수", "윤정숙", "윤정숙"]);
  const yoonRow = tableRows[2];
  expect(within(yoonRow).getAllByText("윤정숙")).toHaveLength(1);
  const links = within(yoonRow).getAllByRole("link");
  expect(links.map((link) => link.textContent)).toEqual(["2026년하반기", "2026년3분기", "2026년9월", "2026-09-28", "2026-09-29"]);
  expect(links[0]).toHaveAttribute("href", "/manager/safety/completions/yoon?date=2026-09-28&resourceId=half&listFrom=2026-09-01&listTo=2026-09-30");
  expect(links[4]).toHaveAttribute("href", "/manager/safety/completions/yoon?date=2026-09-29&resourceId=daily-29&listFrom=2026-09-01&listTo=2026-09-30");
  expect(within(yoonRow).getAllByRole("cell")[2].textContent).toBe("halfquartermonthdaily-28daily-29");
});

it("fills the completion time on toggle and saves the edited value before returning to the original period", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-29T15:10:20Z"));
  window.history.replaceState({}, "", "/manager/safety/completions/employee?date=2026-09-29&resourceId=resource&listFrom=2026-09-01&listTo=2026-09-30");
  const fetchMock = vi.fn(async (_url: unknown, options?: RequestInit) => options?.method === "PATCH"
    ? Response.json({ completion: { id: "completion" } })
    : Response.json({ completions: [{ id: "completion", employee_name: "홍길동", education_date: "2026-09-29", resource_title: "안전교육", education_type: "daily", is_completed: false, completed_at: null }], total: 1 }));
  vi.stubGlobal("fetch", fetchMock);
  render(<EducationHistoryTable detail employeeDetail employeeId="employee" employeeName="홍길동" />);
  const toggle = screen.getByRole("switch", { name: "이수여부" });
  await waitFor(() => expect(toggle).toBeEnabled());
  const timestamp = screen.getByLabelText("이수(완료)일시");
  expect(timestamp).toBeDisabled();
  fireEvent.click(toggle);
  expect(timestamp).toBeEnabled();
  expect(timestamp).toHaveValue("2026-09-30T00:10:20.000");
  fireEvent.change(timestamp, { target: { value: "2026-09-15T14:25:30" } });
  expect(timestamp).toBeValid();
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/manager/safety/completions?from=2026-09-01&to=2026-09-30"));
  const saved = fetchMock.mock.calls.find(([, options]) => options?.method === "PATCH");
  expect(JSON.parse(saved?.[1]?.body as string)).toEqual({ isCompleted: true, completedAt: "2026-09-15T14:25:30.000" });
});

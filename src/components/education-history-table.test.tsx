import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import EducationHistoryTable from "./education-history-table";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  push.mockReset();
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

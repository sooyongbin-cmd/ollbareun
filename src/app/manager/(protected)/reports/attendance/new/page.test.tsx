import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import AttendanceNewPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => { vi.unstubAllGlobals(); push.mockReset(); });

it("selects employee and worksite, creates attendance and returns to the list", async () => {
  const fetchMock = vi.fn(async (url: string) => Response.json(url === "/api/bootstrap"
    ? { employees: [{ id: "emp-1", name: "홍길동" }], worksites: [{ id: "site-1", name: "본사" }] }
    : { attendance: { id: "new-1" } }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<AttendanceNewPage />);
  await screen.findByLabelText("직원이름");
  await user.selectOptions(screen.getByLabelText("직원이름"), "emp-1");
  await user.selectOptions(screen.getByLabelText("근무지"), "site-1");
  fireEvent.change(screen.getByLabelText("출근일시"), { target: { value: "2026-09-09T09:00" } });
  expect(screen.queryByLabelText("퇴근일시")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "취소" })).toHaveAttribute("href", "/manager/reports/attendance");
  expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "저장" }));
  await user.click(screen.getByRole("button", { name: "예" }));
  expect(fetchMock).toHaveBeenCalledWith("/api/manager/reports/attendance", expect.objectContaining({
    method: "POST", body: JSON.stringify({ employeeId: "emp-1", worksiteId: "site-1", clockInDateTime: "2026-09-09T09:00" }),
  }));
  await user.click(await screen.findByRole("button", { name: "확인" }));
  expect(push).toHaveBeenCalledWith("/manager/reports/attendance");
});

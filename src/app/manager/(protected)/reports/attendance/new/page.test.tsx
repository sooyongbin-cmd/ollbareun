import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import AttendanceNewPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => { vi.unstubAllGlobals(); push.mockReset(); });

it("selects employee and worksite, creates attendance and returns to the list", async () => {
  const fetchMock = vi.fn(async (url: string) => Response.json(url === "/api/bootstrap"
    ? {
        employees: [{ id: "emp-1", name: "홍길동" }, { id: "emp-2", name: "김철수" }],
        worksites: [{ id: "site-1", name: "본사" }, { id: "site-2", name: "서울지점" }],
        assignments: [{ employee_id: "emp-1", worksite_id: "site-1" }],
      }
    : { attendance: { id: "new-1" } }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<AttendanceNewPage />);
  const employeeInput = await screen.findByLabelText("직원이름");
  const worksiteInput = screen.getByLabelText("근무지");
  expect(employeeInput).toHaveAttribute("list", "attendance-employee-options");
  expect(worksiteInput).toHaveAttribute("list", "attendance-worksite-options");
  expect(Array.from(document.querySelectorAll<HTMLOptionElement>("#attendance-employee-options option")).map((option) => option.value)).toEqual([
    "김철수",
    "홍길동",
  ]);
  expect(Array.from(document.querySelectorAll<HTMLOptionElement>("#attendance-worksite-options option")).map((option) => option.value)).toEqual([
    "본사",
    "서울지점",
  ]);
  await user.type(employeeInput, "홍길동");
  expect(worksiteInput).toHaveValue("본사");
  await user.clear(worksiteInput);
  await user.type(worksiteInput, "본사");
  fireEvent.change(screen.getByLabelText("출근일시"), { target: { value: "2026-09-09T09:00" } });
  expect(screen.queryByLabelText("퇴근일시")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "목록" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "저장" }));
  await user.click(screen.getByRole("button", { name: "예" }));
  expect(fetchMock).toHaveBeenCalledWith("/api/manager/reports/attendance", expect.objectContaining({
    method: "POST", body: JSON.stringify({ employeeId: "emp-1", worksiteId: "site-1", clockInDateTime: "2026-09-09T09:00" }),
  }));
  await user.click(await screen.findByRole("button", { name: "확인" }));
  expect(push).toHaveBeenCalledWith("/manager/reports/attendance");
});

it("shows an error when the selected employee has no assignment today", async () => {
  const fetchMock = vi.fn(async (url: string) => Response.json(url === "/api/bootstrap"
    ? {
        employees: [{ id: "emp-1", name: "홍길동" }],
        worksites: [{ id: "site-1", name: "본사" }],
        assignments: [],
      }
    : {}));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();

  render(<AttendanceNewPage />);

  await user.type(await screen.findByLabelText("직원이름"), "홍길동");

  expect(await screen.findByRole("alert")).toHaveTextContent("직원(홍길동)의 오늘 배정된 근무지가 없습니다.");
  expect(screen.getByLabelText("근무지")).toHaveValue("");
});

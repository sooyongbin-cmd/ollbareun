import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import EmployeeRoster from "./employee/employees/page";
import Worksites from "./employee/worksites/worksite-management-client";
import Assignments from "./employee/assignments/assignment-management-client";
import Holidays from "./employee/holidays/page";
import Leave from "./leave/page";
import Sites from "./inspection/sites/page";
import Resources from "./safety/resources/page";
import Configs from "./system/configs/page";
import Admins from "./system/admin-users/page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    employees: [], worksites: [], assignments: [], attendance: [],
    holidays: [], leaves: [], sites: [], resources: [], configs: [], admins: [],
    subscriptions: [], currentRole: "super_admin", roles: ["경비원"],
  })));
});

it.each([
  ["직원 등록", "직원등록", EmployeeRoster],
  ["근무지 등록", "근무지등록", Worksites],
  ["배정등록", "배정등록", Assignments],
  ["휴일추가", "휴일추가", Holidays],
  ["휴가신청", "휴가신청", Leave],
  ["점검지 등록", "점검지 등록", Sites],
  ["교재등록", "교재등록", Resources],
  ["등록", "시스템설정 등록", Configs],
  ["관리자등록", "관리자등록", Admins],
] as const)("opens %s in a modal without navigation and closes it", async (label, title, Page) => {
  const user = userEvent.setup();
  render(<Page />);
  await screen.findByRole("button", { name: label });
  await waitFor(() => expect(screen.getByRole("button", { name: label })).toBeEnabled());
  const enabledTrigger = screen.getByRole("button", { name: label });
  await user.click(enabledTrigger);
  const dialog = await screen.findByRole("dialog", { name: title });
  const close = await within(dialog).findByRole("button", { name: "닫기" });
  expect(within(dialog).queryByRole("button", { name: "목록" })).not.toBeInTheDocument();
  await user.click(close);
  expect(screen.queryByRole("dialog", { name: title })).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
  expect(enabledTrigger).toHaveFocus();
});

it("refreshes configurations after saving while staying on the list", async () => {
  const user = userEvent.setup();
  let saved = false;
  vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      saved = true;
      expect(JSON.parse(String(init.body))).toEqual({ description: "새 설정", content: "내용" });
      return Response.json({ config: { system_code: "new", description: "새 설정", content: "내용" } });
    }
    return Response.json({ configs: saved ? [{ system_code: "new", description: "새 설정", content: "내용" }] : [] });
  }));
  render(<Configs />);
  await user.click(screen.getByRole("button", { name: "등록" }));
  const dialog = await screen.findByRole("dialog", { name: "시스템설정 등록" });
  await user.type(await within(dialog).findByLabelText("설명"), "새 설정");
  await user.type(within(dialog).getByLabelText("내용"), "내용");
  await user.click(within(dialog).getByRole("button", { name: "저장" }));
  expect(await screen.findByRole("link", { name: "새 설정" })).toBeInTheDocument();
  expect(vi.mocked(fetch).mock.calls.filter(([, init]) => !init?.method)).toHaveLength(1);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

it("keeps the form open with input intact when a save fails", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
    init?.method === "POST" ? Response.json({ error: "저장 실패" }, { status: 400 }) : Response.json({ configs: [] }),
  ));
  render(<Configs />);
  await user.click(screen.getByRole("button", { name: "등록" }));
  const dialog = await screen.findByRole("dialog", { name: "시스템설정 등록" });
  await user.type(await within(dialog).findByLabelText("설명"), "다시 저장할 설정");
  await user.click(within(dialog).getByRole("button", { name: "저장" }));
  expect(await within(dialog).findByText("저장 실패")).toBeInTheDocument();
  expect(within(dialog).getByLabelText("설명")).toHaveValue("다시 저장할 설정");
  expect(push).not.toHaveBeenCalled();
});

it("refreshes holidays after saving without changing the selected year", async () => {
  const user = userEvent.setup();
  let saved = false;
  vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      saved = true;
      return Response.json({ inserted: 1, holiday: { id: "holiday-1", holiday_date: "2026-10-03", name: "신규휴일", selected: "Y", holiday_type: "custom" } });
    }
    return Response.json({ holidays: saved ? [{ id: "holiday-1", holiday_date: "2026-10-03", name: "신규휴일", selected: "Y" }] : [] });
  }));
  render(<Holidays />);
  const year = screen.getByLabelText("연도");
  const selectedYear = (year as HTMLInputElement).value;
  await waitFor(() => expect(screen.getByRole("button", { name: "휴일추가" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "휴일추가" }));
  const dialog = await screen.findByRole("dialog", { name: "휴일추가" });
  await user.type(await within(dialog).findByLabelText("휴일명"), "신규휴일");
  await user.type(within(dialog).getByLabelText("날짜"), `${selectedYear}-10-03`);
  await user.click(within(dialog).getByRole("button", { name: "저장" }));
  expect(await screen.findByText("신규휴일")).toBeInTheDocument();
  expect(vi.mocked(fetch).mock.calls.filter(([, init]) => !init?.method)).toHaveLength(1);
  expect(year).toHaveValue(Number(selectedYear));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

it("refreshes administrators after saving from an authorized list", async () => {
  const user = userEvent.setup();
  let saved = false;
  vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      saved = true;
      return Response.json({ admin: { id: "admin-1", email: "new@example.com", role: "admin", user_id: null } });
    }
    return Response.json({ currentRole: "super_admin", subscriptions: [], admins: saved
      ? [{ id: "admin-1", email: "new@example.com", role: "admin" }] : [] });
  }));
  render(<Admins />);
  await waitFor(() => expect(screen.getByRole("button", { name: "관리자등록" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "관리자등록" }));
  const dialog = await screen.findByRole("dialog", { name: "관리자등록" });
  await user.type(await within(dialog).findByLabelText("관리자이메일"), "new@example.com");
  await user.click(within(dialog).getByRole("button", { name: "저장" }));
  expect(await screen.findByRole("link", { name: "new@example.com" })).toBeInTheDocument();
  expect(vi.mocked(fetch).mock.calls.filter(([, init]) => !init?.method)).toHaveLength(1);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

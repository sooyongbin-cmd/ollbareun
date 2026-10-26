import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import type { RegistrationResult } from "@/lib/registration-result";
import Worksites from "./employee/worksites/worksite-management-client";
import Resources from "./safety/resources/page";
import Sites from "./inspection/sites/page";
import Assignments from "./employee/assignments/assignment-management-client";
import Leaves from "./leave/page";

const state = vi.hoisted(() => ({ result: { record: {} } as RegistrationResult }));
vi.mock("@/components/modals/registration-modal", () => ({
  default: ({ children, disabled, onSaved }: { children: ReactNode; disabled: boolean; onSaved: (result: RegistrationResult) => void }) =>
    <button type="button" disabled={disabled} onClick={() => onSaved(state.result)}>{children}</button>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
beforeEach(() => { state.result = { record: {} }; });

it.each([
  ["근무지 등록", "신규근무지", Worksites, "/api/bootstrap", { worksites: [{ id: "old", name: "기존근무지", address: "기존 주소", radius_meters: 100 }], assignments: [] }, { id: "new", name: "신규근무지", address: "새 주소", radius_meters: 100 }],
  ["교재등록", "신규교재", Resources, "/api/education/resources", { resources: [{ id: "old", title: "기존교재", education_type: "일일", startdate: "2026-10-01", enddate: "2026-10-31", youtube_link: "https://youtu.be/old" }] }, { id: "new", title: "신규교재", education_type: "일일", startdate: "2026-11-01", enddate: "2026-11-30", youtube_link: "https://youtu.be/new" }],
] as const)("adds %s results without reloading the list", async (button, label, Page, endpoint, payload, record) => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => { expect(String(input)).toBe(endpoint); return Response.json(payload); });
  vi.stubGlobal("fetch", fetchMock);
  render(<Page />);
  await waitFor(() => expect(screen.getByRole("button", { name: button })).toBeEnabled());
  const table = screen.getByRole("table");
  state.result = { record };
  await user.click(screen.getByRole("button", { name: button }));
  expect(await screen.findByRole("link", { name: label })).toBeInTheDocument();
  expect(screen.getByRole("table")).toBe(table);
  expect(fetchMock.mock.calls.filter((call) => String(call[0]) === endpoint)).toHaveLength(1);
});

it("keeps a new inspection site out of a non-matching search without another query", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input) === "/api/bootstrap"
    ? Response.json({ worksites: [] }) : Response.json({ sites: [{ id: "old", name: "정문", worksite_id: "w", worksite_name: "본사", sort_order: 1 }] }));
  vi.stubGlobal("fetch", fetchMock);
  render(<Sites />);
  await screen.findByRole("link", { name: "정문" });
  await user.type(screen.getByLabelText("점검지"), "정문");
  await waitFor(() => expect(screen.getByRole("button", { name: "점검지 등록" })).toBeEnabled());
  const calls = fetchMock.mock.calls.length;
  state.result = { record: { id: "new", name: "후문", worksite_id: "w", worksite_name: "본사", sort_order: 2 } };
  await user.click(screen.getByRole("button", { name: "점검지 등록" }));
  expect(screen.queryByRole("link", { name: "후문" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "정문" })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(calls);
});

it("replaces only overlapping assignment rows, including split IDs, using a scoped request", async () => {
  const user = userEvent.setup();
  const old = { id: "old", employee_id: "e1", employee_name: "직원1", employee_role: "경비원", employee_work_style: "0", worksite_name: "본사", start_date: "2026-10-01", end_date: "2026-10-31" };
  const other = { ...old, id: "other", employee_id: "e2", employee_name: "직원2" };
  const created = { ...old, id: "new", start_date: "2026-10-10", end_date: "2026-10-20" };
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => Response.json({ assignments: String(input).includes("employeeId=")
    ? [{ ...old, id: "left", end_date: "2026-10-09" }, created, { ...old, id: "right", start_date: "2026-10-21" }] : [old, other], employeeNames: ["직원1", "직원2"], worksiteNames: ["본사"] }));
  vi.stubGlobal("fetch", fetchMock);
  render(<Assignments />);
  const otherRow = (await screen.findByRole("link", { name: "직원2" })).closest("tr");
  state.result = { record: created, assignmentScope: { employeeId: "e1", startDate: "2026-10-01", endDate: "2026-10-31" } };
  await user.click(screen.getByRole("button", { name: "배정등록" }));
  await waitFor(() => expect(screen.getAllByRole("link", { name: "직원1" })).toHaveLength(3));
  expect(document.querySelector('a[href="/manager/employee/assignments/save/old"]')).not.toBeInTheDocument();
  expect(document.querySelector('a[href="/manager/employee/assignments/save/left"]')).toBeInTheDocument();
  expect(document.querySelector('a[href="/manager/employee/assignments/save/right"]')).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "직원2" }).closest("tr")).toBe(otherRow);
  expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/assignments")).toHaveLength(1);
  expect(fetchMock.mock.calls[1][0]).toContain("employeeId=e1");
});

it("retries a failed leave projection by its created ID without repeating registration or reloading", async () => {
  const user = userEvent.setup();
  let attempts = 0;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/bootstrap") return Response.json({ employees: [] });
    if (url.includes("?id=new")) {
      if (++attempts === 1) return Response.json({ error: "일시 오류" }, { status: 500 });
      return Response.json({ leaves: [{ id: "new", employeeName: "신규직원", employeeRole: "경비원", workStyle: "일반근무", leaveType: "연차", startDate: "2026-10-01", endDate: "2026-10-02", worksiteName: "본사", assignmentStartDate: null, assignmentEndDate: null }] });
    }
    return Response.json({ leaves: [] });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<Leaves />);
  await waitFor(() => expect(screen.getByRole("button", { name: "휴가신청" })).toBeEnabled());
  state.result = { record: { id: "new" } };
  await user.click(screen.getByRole("button", { name: "휴가신청" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("일시 오류");
  await user.click(screen.getByRole("button", { name: "다시 반영" }));
  expect(await screen.findByRole("link", { name: "신규직원" })).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/leave")).toHaveLength(1);
  expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/leave?id=new")).toHaveLength(2);
});

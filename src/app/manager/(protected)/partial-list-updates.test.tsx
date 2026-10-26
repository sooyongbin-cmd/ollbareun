import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import type { DetailChange } from "@/lib/detail-changes";
import Admins from "./system/admin-users/page";
import Monthly from "./monthly-information/page";
import Reports from "./reports/attendance/page";

const state = vi.hoisted(() => ({ changes: [] as DetailChange[] }));
vi.mock("@/components/modals/detail-modal-link", () => ({
  default: ({ children, href, onSaved, ...props }: { children: ReactNode; href: string; onSaved: (changes: DetailChange[]) => void }) =>
    <a {...props} href={href} onClick={(event) => { event.preventDefault(); onSaved(state.changes); }}>{children}</a>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

beforeEach(() => { state.changes = []; });

it("updates every subscription row for one administrator without reloading the list", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async () => Response.json({ currentRole: "super_admin", admins: [
    { id: "a", user_id: "user-a", email: "a@example.com", role: "admin" },
    { id: "b", user_id: null, email: "b@example.com", role: "admin" },
  ], subscriptions: [
    { id: "sub-1", user_id: "user-a", updated_at: "2026-10-01T00:00:00Z" },
    { id: "sub-2", user_id: "user-a", updated_at: "2026-10-02T00:00:00Z" },
  ] }));
  vi.stubGlobal("fetch", fetchMock);
  render(<Admins />);
  const link = await screen.findByRole("link", { name: "a@example.com" });
  const other = screen.getByRole("link", { name: "b@example.com" }).closest("tr");
  state.changes = [{ entity: "admin", id: "a", action: "upsert", data: { email: "updated@example.com", role: "super_admin" } }];
  await user.click(link);
  expect(await screen.findByRole("link", { name: "updated@example.com" })).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(4);
  expect(screen.getByRole("link", { name: "b@example.com" }).closest("tr")).toBe(other);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

const row = (id: string, employeeId: string, employeeName: string) => ({ id, employeeId, employeeName,
  worksiteId: "site", worksiteName: "본사", employeeRole: "경비원", workStyle: "일반근무", workDate: "2026-10-01",
  status: "결근", intimeStatus: "0", scheduledClockIn: "08:00", scheduledClockOut: "18:00", clockInDateTime: "-", clockOutDateTime: null,
  education: { daily: "-", monthly: "-", quarterly: "-", semiannual: "-", other: "-" }, remarks: [] });

it("refreshes only the changed employee in monthly information and preserves unrelated rows", async () => {
  const user = userEvent.setup();
  const first = row("one", "e1", "직원1");
  const second = row("two", "e2", "직원2");
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname === "/api/bootstrap") return Response.json({ worksites: [] });
    return Response.json({ rows: url.searchParams.has("employeeId") ? [{ ...first, employeePhone: "01099998888", status: "출근" }] : [first, second] });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<Monthly />);
  const links = await screen.findAllByRole("link", { name: /근태 상세 보기/ });
  const other = links[1].closest("tr");
  state.changes = [{ entity: "attendance", id: "one", action: "invalidate", employeeId: "e1" }];
  await user.click(links[0]);
  expect(await screen.findByText("010-9999-8888")).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /근태 상세 보기/ })[1].closest("tr")).toBe(other);
  const requests = fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost")).filter((url) => url.pathname.endsWith("monthly-information"));
  expect(requests).toHaveLength(2);
  expect(requests[1].searchParams.get("employeeId")).toBe("e1");
  expect(requests[1].searchParams.get("yearMonth")).toBe(requests[0].searchParams.get("yearMonth"));
});

it("keeps attendance rows after a partial failure and retries only that ID", async () => {
  const user = userEvent.setup();
  let attempts = 0;
  const first = row("one", "e1", "직원1");
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname === "/api/bootstrap") return Response.json({ employees: [] });
    if (url.searchParams.has("attendanceId")) {
      if (++attempts === 1) return Response.json({ error: "일시적인 오류" }, { status: 500 });
      return Response.json({ rows: [{ ...first, status: "출근" }] });
    }
    return Response.json({ rows: [first] });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<Reports />);
  state.changes = [{ entity: "attendance", id: "one", action: "invalidate", employeeId: "e1" }];
  await user.click(await screen.findByRole("link", { name: /근태 상세 보기/ }));
  const notice = await screen.findByRole("alert");
  expect(screen.getByText("결근")).toBeInTheDocument();
  await user.click(within(notice).getByRole("button", { name: "다시 반영" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  expect(await screen.findByRole("cell", { name: "출근" })).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([input]) => String(input).includes("attendanceId=one"))).toHaveLength(2);
  expect(fetchMock.mock.calls.filter(([input]) => String(input).includes("/reports/attendance?") && !String(input).includes("attendanceId="))).toHaveLength(1);
});

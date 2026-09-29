import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as educationPeriods from "@/lib/education-periods";
import EducationCompletionsPage from "./page";

const day = { employee_id: "employee-1", employee_name: "홍길동", education_date: "2026-09-29", items: [
  { id: "one", resource_id: "r1", resource_title: "화재 예방", education_type: "daily", is_completed: true, completed_at: "2026-09-29T00:00:00Z" },
  { id: "two", resource_id: "r2", resource_title: "월간 안전", education_type: "monthly", is_completed: false, completed_at: null },
] };
beforeEach(() => {
  window.history.replaceState(null, "", "/manager/safety/completions");
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    if (String(input) === "/api/bootstrap") return Response.json({ employees: [{ name: "홍길동" }, { name: "김이영" }, { name: "홍길동" }, { name: "퇴직자", is_retired: true }] });
    if (String(input).includes("/reminders/send")) return Response.json({ successCount: 1, failedCount: 0, unregisteredCount: 0 });
    return Response.json({ rows: [day], total: 51, pageSize: 50 });
  }));
});
afterEach(() => vi.restoreAllMocks());
describe("date-based education report", () => {
  it.each([
    ["2026-09-29", "2026-08-29"],
    ["2026-03-31", "2026-02-28"],
    ["2028-03-31", "2028-02-29"],
    ["2026-01-31", "2025-12-31"],
  ])("defaults to one calendar month before %s and displays dated education rows", async (today, from) => {
    vi.spyOn(educationPeriods, "educationToday").mockReturnValue(today);
    render(<EducationCompletionsPage />);
    const row = (await screen.findByRole("link", { name: "홍길동" })).closest("tr")!;
    expect(screen.getByLabelText("시작일")).toHaveValue(from);
    expect(screen.getByLabelText("종료일")).toHaveValue(today);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`from=${from}&to=${today}`), expect.any(Object));
    expect(within(row).getByText("2026-09-29")).toBeInTheDocument();
    expect(within(row).getByText("화재 예방")).toBeInTheDocument();
    expect(within(row).getByText("일일")).toBeInTheDocument();
    expect(within(row).getByText("월간 안전")).toBeInTheDocument();
    expect(within(row).getByText("월간")).toBeInTheDocument();
  });
  it("automatically queries editable name, date and category filters without search buttons", async () => {
    const user = userEvent.setup(); render(<EducationCompletionsPage />);
    await screen.findByRole("link", { name: "홍길동" });
    expect(screen.queryByRole("button", { name: "조회" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전체 이력" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "이름" })).toHaveAttribute("list", "education-employee-name-options");
    expect(document.querySelector('datalist option[value="김이영"]')).toBeInTheDocument();
    expect(document.querySelectorAll('datalist option[value="홍길동"]')).toHaveLength(1);
    expect(document.querySelector('datalist option[value="퇴직자"]')).not.toBeInTheDocument();
    await user.type(screen.getByRole("combobox", { name: "이름" }), "홍");
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-09-30" } });
    await user.selectOptions(screen.getByLabelText("교육구분"), "monthly");
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("educationType=monthly"), expect.any(Object)));
    const params = new URL(String(vi.mocked(fetch).mock.calls.at(-1)![0]), "http://localhost").searchParams;
    expect(params.get("name")).toBe("홍"); expect(params.get("from")).toBe("2026-09-01"); expect(params.get("to")).toBe("2026-09-30");
  });
  it("requests the next server page", async () => {
    const user = userEvent.setup(); render(<EducationCompletionsPage />);
    await screen.findByRole("link", { name: "홍길동" }); await user.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("page=2"), expect.any(Object)));
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-09-01" } });
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("page=1"), expect.any(Object)));
  });
  it("sends reminders only to pending employees from the filtered report", async () => {
    const user = userEvent.setup(); render(<EducationCompletionsPage />);
    await screen.findByRole("link", { name: "홍길동" }); await user.click(screen.getByRole("button", { name: "미이수 알림 전송" }));
    await screen.findByText("전송 1명 / 실패 0명 / 미등록 0명");
    expect(fetch).toHaveBeenCalledWith("/api/education/reminders/send", expect.objectContaining({ body: JSON.stringify({ employeeIds: ["employee-1"] }) }));
  });
});

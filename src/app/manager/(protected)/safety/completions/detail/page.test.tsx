import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EducationCompletionsDetailPage from "./page";
beforeEach(() => {
  window.history.replaceState(null, "", "/manager/safety/completions/detail?resourceId=r1&employeeId=e1&from=2026-09-29&to=2026-09-29");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ completions: [{ id: "c1", employee_name: "홍길동", education_date: "2026-09-29", resource_title: "안전교육", education_type: "quarterly", is_completed: true, completed_at: "2026-09-29T01:00:00Z" }], total: 1, pageSize: 50 })));
});
describe("education history detail", () => {
  it("shows target date, snapshot category and actual KST completion timestamp", async () => {
    render(<EducationCompletionsDetailPage />);
    expect(await screen.findByRole("cell", { name: "안전교육" })).toBeInTheDocument();
    expect(screen.getByText("2026-09-29")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "분기" })).toBeInTheDocument();
    expect(screen.getByText(/오전 10:00:00/)).toBeInTheDocument();
  });
  it("preserves employee and resource filters from the detail link", async () => {
    render(<EducationCompletionsDetailPage />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("resourceId=r1&employeeId=e1&view=history"), expect.any(Object)));
  });
});

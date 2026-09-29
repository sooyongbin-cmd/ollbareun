import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EducationCompletionsEmployeePage from "./page";

beforeEach(() => {
  window.history.replaceState(null, "", "/manager/safety/completions/employee-1?from=2026-09-29&to=2026-09-29");
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    if (String(input) === "/api/education/resources") return Response.json({ resources: [] });
    return Response.json({
      completions: [{ id: "c1", employee_name: "홍길동", education_date: "2026-09-29", resource_title: "안전교육", education_type: "quarterly", is_completed: true, completed_at: "2026-09-29T01:00:00Z" }],
      total: 1,
      pageSize: 50,
    });
  }));
});

describe("path-based education history detail", () => {
  it("uses the employee ID from the route and preserves date filters in the history request", async () => {
    const page = await EducationCompletionsEmployeePage({ params: Promise.resolve({ employeeId: "employee-1" }) });
    render(page);

    expect(await screen.findByRole("cell", { name: "안전교육" })).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("employeeId=employee-1"),
      expect.any(Object),
    ));
    const requestUrl = new URL(String(vi.mocked(fetch).mock.calls.find(([input]) => String(input).startsWith("/api/education/completions?"))?.[0]), "http://localhost");
    expect(requestUrl.searchParams.get("from")).toBe("2026-09-29");
    expect(requestUrl.searchParams.get("to")).toBe("2026-09-29");
    expect(requestUrl.searchParams.get("view")).toBe("history");
  });
});

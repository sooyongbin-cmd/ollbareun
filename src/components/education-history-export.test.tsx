import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import EducationHistoryTable from "./education-history-table";
import { downloadListWorkbook } from "@/lib/list-export";
vi.mock("@/lib/list-export", async (original) => ({ ...await original<typeof import("@/lib/list-export")>(), downloadListWorkbook: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); window.history.replaceState(null, "", "/"); });
it("exports every matching page and records applied filters rather than unsubmitted input", async () => {
  window.history.replaceState(null, "", "/manager/safety/completions/detail?name=홍길동");
  const record = (id: string) => ({ id, employee_name: "홍길동", education_date: "2026-10-23", resource_title: id,
    education_type: "daily", is_completed: true, completed_at: null });
  const fetchMock = vi.fn(async (url: string) => url === "/api/education/resources"
    ? Response.json({ resources: [] })
    : Response.json({ completions: url.includes("page=2") ? [record("c3")] : [record("c1"), record("c2")], total: 3 }));
  vi.stubGlobal("fetch", fetchMock);
  render(<EducationHistoryTable />);
  await screen.findByText("c1");
  fireEvent.change(screen.getByLabelText("직원 이름"), { target: { value: "김철수" } });
  fireEvent.click(screen.getByRole("button", { name: "엑셀" }));
  await waitFor(() => expect(downloadListWorkbook).toHaveBeenCalledOnce());
  const input = vi.mocked(downloadListWorkbook).mock.calls[0][0];
  expect(input.filters).toContainEqual({ label: "직원 이름", value: "홍길동" });
  const table = await input.getTable();
  expect(table.rows).toHaveLength(3);
  expect(table.rows.map((row) => row[2])).toEqual(["c1", "c2", "c3"]);
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("page=2"));
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InspectionLogsPage from "./page";

describe("inspection logs page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/bootstrap")) {
          return Response.json({ worksites: [{ id: "work-1", name: "Worksite" }] });
        }
        if (url.startsWith("/api/inspection/logs")) {
          return Response.json({
            logs: [
              {
                id: "log-1",
                inspected_at: "2026-06-04T09:00:00+09:00",
                worksite_name: "Worksite",
                site_name: "Gate",
                employee_name: "Alice",
                employee_role: "경비원",
              },
            ],
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("filters logs by selected worksite and shows date, worksite, site, inspector, and role columns", async () => {
    const user = userEvent.setup();
    render(<InspectionLogsPage />);

    expect(await screen.findByRole("heading", { name: "현장점검현황" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "점검일자" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "근무지" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "현장명" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "점검자" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "역할" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("근무지"), "work-1");
    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith("/api/inspection/logs?worksiteId=work-1");
    });
    expect(await screen.findByText("Gate")).toBeInTheDocument();
    const dataRow = screen.getAllByRole("row")[1];
    const cells = within(dataRow).getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent)).toEqual([
      expect.stringContaining("2026"),
      "Worksite",
      "Gate",
      "Alice",
      "경비원",
    ]);
  });
});

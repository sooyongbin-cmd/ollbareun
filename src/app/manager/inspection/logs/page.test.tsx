import { render, screen, waitFor } from "@testing-library/react";
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
          return Response.json({ worksites: [{ id: "work-1", name: "본사" }] });
        }
        if (url.startsWith("/api/inspection/logs")) {
          return Response.json({
            logs: [
              {
                id: "log-1",
                inspected_at: "2026-06-04T09:00:00+09:00",
                site_name: "정문",
                employee_name: "홍길동",
              },
            ],
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("filters logs by selected worksite and shows requested columns", async () => {
    const user = userEvent.setup();
    render(<InspectionLogsPage />);

    expect(await screen.findByRole("heading", { name: "현장점검현황" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "점검날짜" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "현장명" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "점검자" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("근무지"), "work-1");
    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith("/api/inspection/logs?worksiteId=work-1");
    });
    expect(await screen.findByText("정문")).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();
  });
});

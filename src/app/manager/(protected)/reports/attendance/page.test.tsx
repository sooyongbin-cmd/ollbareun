import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendanceReportPage from "./page";

describe("attendance report page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads employee names into a dropdown and enables excel only after search has rows", async () => {
    const user = userEvent.setup();
    const year = new Date().getFullYear();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/bootstrap")) {
        return Response.json({
          employees: [
            { id: "employee-1", name: "김철수", is_retired: false },
            { id: "employee-2", name: "홍길동", is_retired: false },
            { id: "employee-3", name: "퇴직자", is_retired: true },
          ],
        });
      }
      return Response.json({
        rows: [{ date: "2026-06-04", clockInTime: "09:00", clockOutTime: "18:00", workDuration: "9시간" }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AttendanceReportPage />);

    expect(screen.getByRole("heading", { name: "근태내역" })).toBeInTheDocument();
    expect(screen.getByLabelText("연도")).toHaveValue(year);
    expect(screen.getByRole("button", { name: "엑셀" })).toBeDisabled();
    expect(await screen.findByRole("option", { name: "김철수" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "홍길동" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "퇴직자" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("직원이름"), "김철수");
    await user.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/manager/reports/attendance?employeeName=%EA%B9%80%EC%B2%A0%EC%88%98&year=${year}`,
      ),
    );
    expect(await screen.findByText("2026-06-04")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "엑셀" })).toBeEnabled();
  });
});

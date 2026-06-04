import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendanceReportPage from "./page";

describe("attendance report page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not fetch on open and enables excel only after search has rows", async () => {
    const user = userEvent.setup();
    const year = new Date().getFullYear();
    const fetchMock = vi.fn(async () =>
      Response.json({
        rows: [{ date: "2026-06-04", clockInTime: "09:00", clockOutTime: "18:00", workDuration: "9시간" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AttendanceReportPage />);

    expect(screen.getByRole("heading", { name: "근태내역" })).toBeInTheDocument();
    expect(screen.getByLabelText("연도")).toHaveValue(year);
    expect(screen.getByRole("button", { name: "엑셀" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("직원이름"), "김철수");
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

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendanceReportPage from "./page";

describe("attendance report page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads employee names into an editable input and searches when the conditions change", async () => {
    const user = userEvent.setup();
    const workDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
        rows: [
          {
            id: "attendance-1",
            employeeName: "김철수",
            workStyle: "일반근무",
            worksiteName: "본사",
            scheduledClockIn: "09:00",
            scheduledClockOut: "18:00",
            clockInDateTime: "2026-06-04 09:00",
            clockOutDateTime: "2026-06-04 18:00",
            workDuration: "9시간",
            intimeStatus: "1",
            status: "지각",
            isLate: true,
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AttendanceReportPage />);

    expect(screen.getByRole("heading", { name: "근태관리" })).toBeInTheDocument();
    expect(screen.getByLabelText("출근날짜")).toHaveValue(workDate);
    expect(screen.getByRole("button", { name: "엑셀" })).toBeDisabled();
    await waitFor(() => expect(document.querySelector('datalist option[value="김철수"]')).toBeInTheDocument());
    expect(document.querySelector('datalist option[value="홍길동"]')).toBeInTheDocument();
    expect(document.querySelector('datalist option[value="퇴직자"]')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("직원이름"), "김철수");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/manager/reports/attendance?employeeName=%EA%B9%80%EC%B2%A0%EC%88%98&workDate=${workDate}`,
      ),
    );
    expect(await screen.findByText("2026-06-04 09:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "엑셀" })).toBeEnabled();
    expect(screen.getByText("지각")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "이름" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "수정" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /2026-06-04 09:00 근태 기록 수정/ })).toHaveAttribute(
      "href",
      "/manager/reports/attendance/save/attendance-1",
    );
  });

  it("links an attendance row to its edit page", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/bootstrap")) {
        return Response.json({ employees: [{ id: "employee-1", name: "김철수", is_retired: false }] });
      }
      return Response.json({
        rows: [
          {
            id: "attendance-1",
            employeeName: "김철수",
            workStyle: "일반근무",
            worksiteName: "본사",
            scheduledClockIn: "09:00",
            scheduledClockOut: "18:00",
            clockInDateTime: "2026-06-04 09:00",
            clockOutDateTime: null,
            workDuration: "-",
            intimeStatus: "0",
            status: "결근",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AttendanceReportPage />);
    await waitFor(() => expect(document.querySelector('datalist option[value="김철수"]')).toBeInTheDocument());
    await user.type(screen.getByLabelText("직원이름"), "김철수");
    expect(await screen.findByRole("link", { name: /2026-06-04 09:00 근태 기록 수정/ })).toHaveAttribute(
      "href",
      "/manager/reports/attendance/save/attendance-1",
    );
  });
});

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
        rows: [
          {
            id: "attendance-1",
            employeeName: "김철수",
            clockInDateTime: "2026-06-04 09:00",
            clockOutDateTime: "2026-06-04 18:00",
            workDuration: "9시간",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AttendanceReportPage />);

    expect(screen.getByRole("heading", { name: "근태관리" })).toBeInTheDocument();
    expect(screen.getByLabelText("연도")).toHaveValue(year);
    expect(screen.getByRole("button", { name: "엑셀" })).toBeDisabled();
    await waitFor(() => expect(document.querySelector('datalist option[value="김철수"]')).toBeInTheDocument());
    expect(document.querySelector('datalist option[value="홍길동"]')).toBeInTheDocument();
    expect(document.querySelector('datalist option[value="퇴직자"]')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("직원이름"), "김철수");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/manager/reports/attendance?employeeName=%EA%B9%80%EC%B2%A0%EC%88%98&year=${year}`,
      ),
    );
    expect(await screen.findByText("2026-06-04 09:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "엑셀" })).toBeEnabled();
    expect(screen.queryByRole("columnheader", { name: "직원이름" })).not.toBeInTheDocument();
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
            clockInDateTime: "2026-06-04 09:00",
            clockOutDateTime: null,
            workDuration: "-",
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

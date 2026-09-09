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

    expect(screen.getByRole("heading", { name: "근태내역" })).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: /2026-06-04 09:00 근태 기록 수정/ })).toBeEnabled();
  });

  it("opens the edit modal for an unfinished row and saves both date-time values", async () => {
    const user = userEvent.setup();
    let saved = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/bootstrap")) {
        return Response.json({ employees: [{ id: "employee-1", name: "김철수", is_retired: false }] });
      }
      if (init?.method === "PATCH") {
        saved = true;
        return Response.json({ attendance: { id: "attendance-1", clock_out_at: "2026-06-04T10:00:00.000Z" } });
      }
      return Response.json({
        rows: [
          {
            id: "attendance-1",
            employeeName: "김철수",
            clockInDateTime: saved ? "2026-06-04 08:30" : "2026-06-04 09:00",
            clockOutDateTime: saved ? "2026-06-04 19:00" : null,
            workDuration: saved ? "10시간 30분" : "-",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AttendanceReportPage />);
    await waitFor(() => expect(document.querySelector('datalist option[value="김철수"]')).toBeInTheDocument());
    await user.type(screen.getByLabelText("직원이름"), "김철수");
    await user.click(await screen.findByRole("button", { name: /2026-06-04 09:00 근태 기록 수정/ }));

    const dialog = screen.getByRole("dialog", { name: "근태 기록 수정" });
    const clockInInput = screen.getByLabelText("출근일시");
    const clockOutInput = screen.getByLabelText("퇴근일시");
    expect(dialog).toBeInTheDocument();
    expect(clockInInput).toHaveValue("2026-06-04T09:00");
    expect(clockOutInput).not.toHaveValue("");

    await user.clear(clockInInput);
    await user.type(clockInInput, "2026-06-04T08:30");
    await user.clear(clockOutInput);
    await user.type(clockOutInput, "2026-06-04T19:00");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/manager/reports/attendance",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            recordId: "attendance-1",
            clockInDateTime: "2026-06-04T08:30",
            clockOutDateTime: "2026-06-04T19:00",
          }),
        }),
      ),
    );
    expect(await screen.findByText("2026-06-04 08:30")).toBeInTheDocument();
    expect(await screen.findByText("2026-06-04 19:00")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "근태 기록 수정" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2026-06-04 08:30 근태 기록 수정/ })).toBeEnabled();
  });
});

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendanceStatusPage from "./page";

const statusPayload = {
  date: "2026-09-11",
  rows: [
    {
      id: "assignment-1",
      employeeName: "김철수",
      workStyle: "일반근무",
      worksiteName: "본사",
      scheduledClockIn: "06:00",
      scheduledClockOut: "18:00",
      clockInDateTime: "2026-09-11 06:05",
      clockOutDateTime: "2026-09-11 18:00",
      workDuration: "11시간 55분",
      status: "지각",
    },
    {
      id: "assignment-2",
      employeeName: "이영희",
      workStyle: "야간근무",
      worksiteName: "센텀현장",
      scheduledClockIn: "07:00",
      scheduledClockOut: "16:00",
      clockInDateTime: null,
      clockOutDateTime: null,
      workDuration: "-",
      status: "대기",
    },
  ],
};

describe("attendance status page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(statusPayload)));
  });

  it("loads the selected date and renders expected and actual attendance details", async () => {
    render(<AttendanceStatusPage />);

    expect(await screen.findByRole("heading", { name: "출근현황" })).toBeInTheDocument();
    const search = screen.getByRole("region", { name: "출근현황 조회" });
    const list = screen.getByRole("region", { name: "출근현황 목록" });
    expect(within(search).getByLabelText("날짜")).toHaveAttribute("type", "date");
    expect(within(list).getByRole("columnheader", { name: "근무형태" })).toBeInTheDocument();
    expect(within(list).getByRole("columnheader", { name: "출근예정" })).toBeInTheDocument();
    expect(within(list).getByRole("columnheader", { name: "퇴근예정" })).toBeInTheDocument();
    expect(within(list).getByRole("columnheader", { name: "출근일시" })).toBeInTheDocument();
    expect(within(list).getByRole("columnheader", { name: "퇴근일시" })).toBeInTheDocument();
    expect(within(list).getByRole("columnheader", { name: "근무시간" })).toBeInTheDocument();
    expect(within(list).getByRole("columnheader", { name: "상태" })).toBeInTheDocument();
    expect(within(list).getByText("김철수")).toBeInTheDocument();
    expect(within(list).getByText("일반근무")).toBeInTheDocument();
    expect(within(list).getByText("2026-09-11 06:05")).toBeInTheDocument();
    expect(within(list).getByText("11시간 55분")).toBeInTheDocument();
    expect(within(list).getByText("지각")).toBeInTheDocument();
    expect(within(list).getByText("대기")).toBeInTheDocument();

    const dateInput = within(search).getByLabelText("날짜");
    fireEvent.change(dateInput, { target: { value: "2026-09-10" } });
    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith("/api/manager/reports/attendance/status?date=2026-09-10");
    });
  });
});

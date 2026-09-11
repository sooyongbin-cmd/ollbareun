import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendanceStatusPage from "./page";

const statusPayload = {
  date: "2026-09-11",
  rows: [
    {
      id: "assignment-1",
      employeeName: "김철수",
      role: "경비원",
      worksiteName: "본사",
      scheduledClockIn: "06:00",
      clockInTime: "06:05",
      status: "지각",
    },
    {
      id: "assignment-2",
      employeeName: "이영희",
      role: "미화원",
      worksiteName: "센텀현장",
      scheduledClockIn: "07:00",
      clockInTime: null,
      status: "결근",
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
    expect(within(list).getByRole("columnheader", { name: "출근예정" })).toBeInTheDocument();
    expect(within(list).getByRole("columnheader", { name: "출근시각" })).toBeInTheDocument();
    expect(within(list).getByRole("columnheader", { name: "상태" })).toBeInTheDocument();
    expect(within(list).getByText("김철수")).toBeInTheDocument();
    expect(within(list).getByText("06:05")).toBeInTheDocument();
    expect(within(list).getByText("지각")).toBeInTheDocument();
    expect(within(list).getByText("결근")).toBeInTheDocument();

    const dateInput = within(search).getByLabelText("날짜");
    fireEvent.change(dateInput, { target: { value: "2026-09-10" } });
    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith("/api/manager/reports/attendance/status?date=2026-09-10");
    });
  });
});

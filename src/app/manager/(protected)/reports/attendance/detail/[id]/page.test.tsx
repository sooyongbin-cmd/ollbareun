import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendanceDetailPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "attendance-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

describe("attendance detail page", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("prefills clock-in and clock-out inputs from the existing record", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ attendance: {
      id: "attendance-1",
      worksiteName: "본사",
      workDate: "2026-09-27",
      workStyle: "일반근무",
      scheduledClockIn: "09:00",
      scheduledClockOut: "18:00",
      status: "출근",
      intimeStatus: "2",
      outtimeStatus: "2",
      outtimeLabel: "퇴근",
      clockInLatitude: null,
      clockInLongitude: null,
      clockOutLatitude: null,
      clockOutLongitude: null,
      employeeName: "김철수",
      clockInDateTime: "2026-09-27 09:05",
      clockOutDateTime: "2026-09-27 18:10",
    } })).mockResolvedValueOnce(Response.json({ attendance: {} }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AttendanceDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("출근날짜")).toHaveValue("2026-09-27");
      expect(screen.getByLabelText("출근일시")).toHaveValue("2026-09-27T09:05");
      expect(screen.getByLabelText("퇴근일시")).toHaveValue("2026-09-27T18:10");
    });
    fireEvent.change(screen.getByLabelText("출근날짜"), { target: { value: "2026-09-28" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    fireEvent.click(await screen.findByRole("button", { name: "예" }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/manager/reports/attendance/attendance-1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ workDate: "2026-09-28", clockInDateTime: "2026-09-27T09:05", clockOutDateTime: "2026-09-27T18:10" }),
    })));
  });

  it("leaves inputs empty when the record has no actual clock times", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ attendance: {
      id: "attendance-1",
      worksiteName: "본사",
      workDate: "2026-09-27",
      workStyle: "일반근무",
      scheduledClockIn: "09:00",
      scheduledClockOut: "18:00",
      status: "결근",
      intimeStatus: "0",
      outtimeStatus: "0",
      outtimeLabel: "미퇴근",
      clockInLatitude: null,
      clockInLongitude: null,
      clockOutLatitude: null,
      clockOutLongitude: null,
      employeeName: "김철수",
      clockInDateTime: "-",
      clockOutDateTime: null,
    } })));

    render(<AttendanceDetailPage />);

    await waitFor(() => expect(screen.getByLabelText("출근일시")).toHaveValue(""));
    expect(screen.getByLabelText("퇴근일시")).toHaveValue("");
  });
});

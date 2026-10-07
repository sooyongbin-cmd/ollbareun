import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendanceDetailPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "attendance-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

describe("attendance detail page", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows an ordered list and immediately completes an incomplete resource", async () => {
    const education = [
      { resourceId: "other", title: "기타교재", educationType: "other", isCompleted: true },
      { resourceId: "quarterly", title: "분기교재", educationType: "quarterly", isCompleted: false },
      { resourceId: "daily", title: "일일교재", educationType: "daily", isCompleted: true },
    ];
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ attendance: { workDate: "2026-10-07", clockInDateTime: "2026-10-07 09:00", clockOutDateTime: null }, education }))
      .mockResolvedValueOnce(Response.json({ resourceId: "quarterly", isCompleted: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AttendanceDetailPage />);
    await screen.findByText("분기교재");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["일일", "분기", "기타"]);
    expect(within(rows[0]).queryByRole("button")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "분기교재 이수 처리" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "분기교재 이수 처리" })).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/manager/reports/attendance/attendance-1/education", expect.objectContaining({ method: "POST", body: JSON.stringify({ resourceId: "quarterly" }) }));
    expect(within(screen.getAllByRole("row")[2]).getByText("이수")).toBeInTheDocument();
  });

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
      employeeName: "김철수",
      clockInDateTime: "2026-09-27 09:05",
      clockOutDateTime: "2026-09-27 18:10",
    } })).mockResolvedValueOnce(Response.json({ attendance: {} }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AttendanceDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("출근날짜")).toHaveValue("2026-09-27");
      expect(screen.getByLabelText("출근날짜")).toHaveAttribute("readonly");
      expect(screen.getByLabelText("출근일시")).toHaveValue("2026-09-27T09:05");
      expect(screen.getByLabelText("퇴근일시")).toHaveValue("2026-09-27T18:10");
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    fireEvent.click(await screen.findByRole("button", { name: "예" }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/manager/reports/attendance/attendance-1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ clockInDateTime: "2026-09-27T09:05", clockOutDateTime: "2026-09-27T18:10" }),
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
      employeeName: "김철수",
      clockInDateTime: "-",
      clockOutDateTime: null,
    } })));

    render(<AttendanceDetailPage />);

    await waitFor(() => expect(screen.getByLabelText("출근일시")).toHaveValue(""));
    expect(screen.getByLabelText("퇴근일시")).toHaveValue("");
  });
});

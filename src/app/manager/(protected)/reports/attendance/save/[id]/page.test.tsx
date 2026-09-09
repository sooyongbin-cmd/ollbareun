import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AttendanceSavePage from "./page";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "record-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockAttendance(coordinates: Record<string, number | null>, failAddress = false, clockOutDateTime: string | null = null) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith("/api/kakao/reverse-geocode")) {
      return failAddress
        ? Response.json({ error: "Unavailable" }, { status: 500 })
        : Response.json({ address: url.includes("lat=0") ? "출근 주소 결과" : "퇴근 주소 결과" });
    }
    return Response.json({ attendance: {
      id: "record-1", employeeName: "홍길동", worksiteName: "본사",
      clockInDateTime: "2026-09-09 09:00", clockOutDateTime,
      ...coordinates,
    } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("attendance addresses", () => {
  it("reveals clock-out after processing and saves the entered time", async () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-09-09T09:30:00Z").getTime());
    const user = userEvent.setup();
    const fetchMock = mockAttendance({});
    render(<AttendanceSavePage />);
    await screen.findByDisplayValue("홍길동");
    await user.click(screen.getByRole("button", { name: "퇴근처리" }));
    expect(screen.queryByRole("button", { name: "퇴근처리" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("퇴근일시")).toBeVisible();
    expect(screen.getByLabelText("퇴근일시")).toHaveValue("2026-09-09T18:30");
    fireEvent.change(screen.getByLabelText("퇴근일시"), { target: { value: "2026-09-09T18:00" } });
    await user.click(screen.getByRole("button", { name: "저장" }));
    await user.click(screen.getByRole("button", { name: "예" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/manager/reports/attendance/record-1", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ clockInDateTime: "2026-09-09T09:00", clockOutDateTime: "2026-09-09T18:00" }),
    }));
  });

  it("shows existing clock-out time and hides processing button", async () => {
    mockAttendance({}, false, "2026-09-09 18:00");
    render(<AttendanceSavePage />);
    await screen.findByDisplayValue("홍길동");
    expect(screen.getByLabelText("퇴근일시")).toBeVisible();
    expect(screen.getByLabelText("퇴근일시")).toHaveValue("2026-09-09T18:00");
    expect(screen.getByLabelText("근무시간")).toHaveValue("9시간");
    expect(screen.getByLabelText("근무시간")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByLabelText("퇴근일시"), { target: { value: "2026-09-10T10:30" } });
    expect(screen.getByLabelText("근무시간")).toHaveValue("25시간 30분");
    fireEvent.change(screen.getByLabelText("출근일시"), { target: { value: "2026-09-10T10:00" } });
    expect(screen.getByLabelText("근무시간")).toHaveValue("30분");
    expect(screen.queryByRole("button", { name: "퇴근처리" })).not.toBeInTheDocument();
  });

  it("hides GPS fields and missing clock-out time and omits clock-out from saves", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAttendance({ clockInLatitude: 37, clockInLongitude: 127 });
    render(<AttendanceSavePage />);
    await screen.findByDisplayValue("홍길동");
    expect(screen.queryByLabelText("출근 위도")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("출근 경도")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("퇴근 위도")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("퇴근 경도")).not.toBeInTheDocument();
    expect(screen.getByLabelText("퇴근일시")).not.toBeVisible();
    expect(screen.queryByLabelText("근무시간")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "저장" }));
    await user.click(screen.getByRole("button", { name: "예" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/manager/reports/attendance/record-1", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ clockInDateTime: "2026-09-09T09:00" }),
    }));
  });

  it("looks up both coordinate pairs and displays read-only addresses, including zero coordinates", async () => {
    const fetchMock = mockAttendance({ clockInLatitude: 0, clockInLongitude: 127, clockOutLatitude: 37.5, clockOutLongitude: 128 });
    render(<AttendanceSavePage />);
    expect(await screen.findByDisplayValue("출근 주소 결과")).toHaveAttribute("readonly");
    expect(await screen.findByDisplayValue("퇴근 주소 결과")).toHaveAttribute("readonly");
    expect(fetchMock).toHaveBeenCalledWith("/api/kakao/reverse-geocode?lat=0&lng=127", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/kakao/reverse-geocode?lat=37.5&lng=128", expect.any(Object));
  });

  it("hides addresses and skips lookups when either coordinate is missing", async () => {
    const fetchMock = mockAttendance({ clockInLatitude: null, clockInLongitude: 127, clockOutLatitude: 37, clockOutLongitude: null });
    render(<AttendanceSavePage />);
    await screen.findByDisplayValue("홍길동");
    expect(screen.queryByLabelText("출근 주소")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("퇴근 주소")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the edit form available if address lookup fails", async () => {
    mockAttendance({ clockInLatitude: 37, clockInLongitude: 127 }, true);
    render(<AttendanceSavePage />);
    expect(await screen.findByDisplayValue("주소를 조회하지 못했습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeEnabled();
  });
});

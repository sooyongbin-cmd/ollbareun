import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AttendanceSavePage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "record-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => vi.unstubAllGlobals());

function mockAttendance(coordinates: Record<string, number | null>, failAddress = false) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith("/api/kakao/reverse-geocode")) {
      return failAddress
        ? Response.json({ error: "Unavailable" }, { status: 500 })
        : Response.json({ address: url.includes("lat=0") ? "출근 주소 결과" : "퇴근 주소 결과" });
    }
    return Response.json({ attendance: {
      id: "record-1", employeeName: "홍길동", worksiteName: "본사",
      clockInDateTime: "2026-09-09 09:00", clockOutDateTime: null,
      ...coordinates,
    } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("attendance addresses", () => {
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

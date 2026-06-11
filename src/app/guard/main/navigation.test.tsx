import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendancePage from "./attendance/page";
import GuardMainLayout from "./layout";
import GuardMainPage from "./page";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

const guardSession = {
  employee: {
    id: "employee-1",
    name: "홍길동",
    phone: "010-1234-5678",
    phone_normalized: "01012345678",
    is_retired: false,
  },
  assignment: {
    id: "assignment-1",
    employee_id: "employee-1",
    worksite_id: "worksite-1",
    start_date: "2026-05-24",
    end_date: "2026-05-24",
  },
  worksite: {
    id: "worksite-1",
    name: "본사",
    gps_info: { latitude: 37.5665, longitude: 126.978 },
    radius_meters: 100,
  },
  attendance: null,
};

describe("guard main navigation", () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    vi.restoreAllMocks();
    document.head.innerHTML = "";
    delete window.kakao;
    window.sessionStorage.clear();
  });

  it("redirects to the guard login page when no guard session exists", () => {
    render(
      <GuardMainLayout>
        <GuardMainPage />
      </GuardMainLayout>,
    );

    expect(replace).toHaveBeenCalledWith("/guard");
  });

  it("shows authenticated guard name and worksite in the section navigation", async () => {
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(
      <GuardMainLayout>
        <GuardMainPage />
      </GuardMainLayout>,
    );

    expect(await screen.findByText("홍길동")).toBeInTheDocument();
    expect(screen.queryByText("010-1234-5678")).not.toBeInTheDocument();
    expect(screen.getByText("(오늘의 근무지 : 본사)")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "나가기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "서비스" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "관리자 대시보드" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "경비원 출입" })).not.toBeInTheDocument();
  });

  it("links the guard section title to the guard main page", () => {
    render(
      <GuardMainLayout>
        <GuardMainPage />
      </GuardMainLayout>,
    );

    expect(screen.getByRole("link", { name: "경비원" })).toHaveAttribute("href", "/guard/main");
  });

  it("keeps the main page as an entry point to attendance", () => {
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    expect(screen.getByRole("heading", { name: "푸시 알림 연결 준비 중" })).toBeInTheDocument();
    expect(screen.getByText("브라우저 지원 확인")).toBeInTheDocument();
    expect(screen.getByText("서버 저장")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "출근하기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "교육 받기" })).toHaveAttribute("href", "/guard/main/safety");
    expect(screen.getByRole("link", { name: "현장점검" })).toHaveAttribute("href", "/guard/main/inspection");
    expect(screen.queryByRole("button", { name: "근무지확인" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "개인프로필" })).toHaveAttribute("href", "/guard/main/profile");
    expect(screen.queryByTestId("clock-in")).not.toBeInTheDocument();
  });

  it("prominently displays today's worksite on the main page", async () => {
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    expect(await screen.findByText(/오늘의 근무지/)).toBeInTheDocument();
    expect(screen.getByText("본사")).toBeInTheDocument();
    expect(screen.getByText(/배정기간/)).toBeInTheDocument();
    expect(screen.getByText("2026-05-24")).toBeInTheDocument();
  });

  it("displays attendance status on the main page", async () => {
    const sessionWithAttendance = {
      ...guardSession,
      attendance: {
        id: "att-1",
        employee_id: "employee-1",
        worksite_id: "worksite-1",
        work_date: "2026-05-24",
        clock_in_at: "2026-05-24T08:00:00Z",
        clock_out_at: "2026-05-24T17:00:00Z",
      },
    };
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(sessionWithAttendance));

    render(<GuardMainPage />);

    expect(await screen.findByText("출근 상황")).toBeInTheDocument();
    expect(screen.getByText("출근 시각")).toBeInTheDocument();
    expect(screen.getByText("퇴근 시각")).toBeInTheDocument();
    expect(screen.getByText(/오늘의 근무가 모두 완료되었습니다/)).toBeInTheDocument();
  });

  it("shows the attendance workflow on the attendance page", () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<AttendancePage />);

    expect(screen.queryByRole("link", { name: "홈으로" })).not.toBeInTheDocument();
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: true,
      timeout: 8000,
    });
    expect(screen.queryByRole("button", { name: "현재 위치 가져오기" })).not.toBeInTheDocument();
    expect(screen.getByTestId("clock-in")).toBeInTheDocument();
  });

  it("adds the attendance map section and stable section ids", async () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<AttendancePage />);

    expect(screen.getByTestId("attendance-map")).toHaveAttribute("id", "attendance-map-canvas");
    expect(document.getElementById("attendance-map-section")).toBeInTheDocument();
    expect(document.getElementById("attendance-profile-section")).toBeInTheDocument();
    expect(document.getElementById("attendance-current-location-section")).toBeInTheDocument();
    expect(document.getElementById("attendance-decision-section")).toBeInTheDocument();
    expect(document.getElementById("attendance-actions-section")).toBeInTheDocument();
    expect(document.getElementById("attendance-record-section")).toBeInTheDocument();

    await waitFor(() => {
      const script = document.head.querySelector<HTMLScriptElement>('script[src="/api/kakao/maps-sdk"]');
      expect(script).toBeInTheDocument();
      expect(script?.async).toBe(false);
    });
  });

  it("renders worksite marker, geofence circle, and current location marker on the attendance map", async () => {
    const map = {
      relayout: vi.fn(),
      setCenter: vi.fn(),
    };
    const markers: unknown[] = [];
    const circles: unknown[] = [];
    const latLngs: Array<{ latitude: number; longitude: number }> = [];
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 37.567,
          longitude: 126.979,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    });

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    Object.assign(window, {
      kakao: {
        maps: {
          load: (callback: () => void) => callback(),
          LatLng: vi.fn(function LatLng(latitude: number, longitude: number) {
            const position = {
              latitude,
              longitude,
              getLat: () => latitude,
              getLng: () => longitude,
            };
            latLngs.push({ latitude, longitude });
            return position;
          }),
          Map: vi.fn(function Map() {
            return map;
          }),
          Marker: vi.fn(function Marker(options: unknown) {
            markers.push(options);
            return {
              setMap: vi.fn(),
              setPosition: vi.fn(),
            };
          }),
          Circle: vi.fn(function Circle(options: unknown) {
            circles.push(options);
            return {
              setMap: vi.fn(),
              setPosition: vi.fn(),
              setRadius: vi.fn(),
            };
          }),
          MarkerImage: vi.fn(function MarkerImage(src: string, size: unknown, options: unknown) {
            return { src, size, options };
          }),
          Size: vi.fn(function Size(width: number, height: number) {
            return { width, height };
          }),
          Point: vi.fn(function Point(x: number, y: number) {
            return { x, y };
          }),
        },
      },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<AttendancePage />);

    await waitFor(() => {
      expect(markers).toHaveLength(2);
      expect(circles).toHaveLength(1);
    });

    expect(latLngs).toContainEqual({ latitude: 37.5665, longitude: 126.978 });
    expect(latLngs).toContainEqual({ latitude: 37.567, longitude: 126.979 });
    expect(markers[0]).toMatchObject({
      position: expect.objectContaining({ latitude: 37.5665, longitude: 126.978 }),
      map,
    });
    expect(markers[1]).toMatchObject({
      position: expect.objectContaining({ latitude: 37.567, longitude: 126.979 }),
      map,
    });
    expect(circles[0]).toMatchObject({
      center: expect.objectContaining({ latitude: 37.5665, longitude: 126.978 }),
      radius: 100,
      map,
    });
    expect(map.setCenter).toHaveBeenCalledWith(expect.objectContaining({ latitude: 37.5665, longitude: 126.978 }));
  });

  it("adds the unauthenticated attendance section id", () => {
    render(<AttendancePage />);

    expect(document.getElementById("attendance-auth-required-section")).toBeInTheDocument();
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendancePage from "./attendance/page";
import GuardMainLayout from "./layout";
import GuardMainPage from "./page";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/guard/main",
}));

const guardSession = {
  employee: {
    id: "employee-1",
    name: "홍길동",
    phone: "010-1234-5678",
    phone_normalized: "01012345678",
    is_retired: false,
    role: "경비원",
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
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/system/configs/USE_QR_CODE")) {
          return Response.json({ config: { system_code: "USE_QR_CODE", content: "Y" } });
        }
        return Response.json({});
      }),
    );
    document.head.innerHTML = "";
    delete window.kakao;
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: undefined,
    });
    window.localStorage.clear();
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

  it("keeps the main page as an entry point to attendance", async () => {
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    expect(screen.getAllByRole("button", { name: "출근하기" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "출근하기" })[0]).toHaveAttribute(
      "data-variant",
      "outline",
    );
    expect(screen.getAllByRole("button", { name: "출근하기" })[0]).not.toHaveClass(
      "text-primary-foreground",
    );
    expect(screen.getByRole("link", { name: "교육 받기" })).toHaveAttribute("href", "/guard/main/safety");
    expect(await screen.findByRole("button", { name: "순찰(QR코드)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "순찰(NFC태그)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "특이사항" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "근무지확인" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "개인프로필" })).toHaveAttribute("href", "/guard/main/profile");
    expect(screen.queryByTestId("clock-in")).not.toBeInTheDocument();
  });

  it("does not ask for location permission immediately on the main page", () => {
    const query = vi.fn(async () => ({ state: "prompt" }));

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    expect(query).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "위치 권한이 필요합니다" })).not.toBeInTheDocument();
  });

  it("navigates to attendance when location permission is granted", async () => {
    const user = userEvent.setup();
    const query = vi.fn(async () => ({ state: "granted" }));

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    await user.click(screen.getAllByRole("button", { name: "출근하기" })[0]);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/guard/main/attendance");
    });
    expect(query).toHaveBeenCalledWith({ name: "geolocation" });
  });

  it("navigates to QR inspection when location permission is granted", async () => {
    const user = userEvent.setup();
    const query = vi.fn(async () => ({ state: "granted" }));

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    await user.click(await screen.findByRole("button", { name: "순찰(QR코드)" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/guard/main/inspection");
    });
    expect(query).toHaveBeenCalledWith({ name: "geolocation" });
  });

  it("navigates to NFC inspection when location permission is granted", async () => {
    const user = userEvent.setup();
    const query = vi.fn(async () => ({ state: "granted" }));

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    await user.click(screen.getByRole("button", { name: "순찰(NFC태그)" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/guard/main/inspection-nfc");
    });
    expect(query).toHaveBeenCalledWith({ name: "geolocation" });
  });

  it("navigates to special remarks when location permission is granted", async () => {
    const user = userEvent.setup();
    const query = vi.fn(async () => ({ state: "granted" }));

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    await user.click(screen.getByRole("button", { name: "특이사항" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/guard/main/special-remarks");
    });
    expect(query).toHaveBeenCalledWith({ name: "geolocation" });
  });

  it("blocks attendance navigation and shows guidance when location permission is denied", async () => {
    const user = userEvent.setup();
    const query = vi.fn(async () => ({ state: "denied" }));

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    await user.click(screen.getAllByRole("button", { name: "출근하기" })[0]);

    expect(push).not.toHaveBeenCalledWith("/guard/main/attendance");
    expect(await screen.findByRole("heading", { name: "위치 권한이 필요합니다" })).toBeInTheDocument();
    expect(screen.getByText(/설정에서 위치 권한을 허용/)).toBeInTheDocument();
  });

  it("blocks worksite-required navigation when no worksite is assigned", async () => {
    const user = userEvent.setup();
    const query = vi.fn(async () => ({ state: "granted" }));
    const sessionWithoutWorksite = {
      ...guardSession,
      assignment: null,
      worksite: null,
    };

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(sessionWithoutWorksite));

    render(<GuardMainPage />);

    const worksiteRequiredButtons = [
      screen.getAllByRole("button", { name: "출근하기" })[0],
      await screen.findByRole("button", { name: "순찰(QR코드)" }),
      screen.getByRole("button", { name: "순찰(NFC태그)" }),
      screen.getByRole("button", { name: "특이사항" }),
    ];

    for (const button of worksiteRequiredButtons) {
      await user.click(button);

      expect(push).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
      expect(await screen.findByRole("heading", { name: "배정된 근무지가 없습니다" })).toBeInTheDocument();
      expect(screen.getByText("관리자에게 근무지 배정을 요청한 뒤 다시 시도해주세요.")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "확인" }));
    }
  });

  it("requests location permission on click and navigates when the user allows it", async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn((success: any) => {
      success({
        coords: {
          latitude: 37.5665,
          longitude: 126.978,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as any);
    });
    const query = vi.fn(async () => ({ state: "prompt" }));

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    await user.click(screen.getAllByRole("button", { name: "출근하기" })[0]);

    expect(getCurrentPosition).toHaveBeenCalled();
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/guard/main/attendance");
    });
  });

  it("blocks navigation when the user denies the location request", async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
    });
    const query = vi.fn(async () => ({ state: "prompt" }));

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    await user.click(await screen.findByRole("button", { name: "순찰(QR코드)" }));

    expect(getCurrentPosition).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalledWith("/guard/main/inspection");
    expect(await screen.findByRole("heading", { name: "위치 권한이 필요합니다" })).toBeInTheDocument();
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
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    const sessionWithAttendance = {
      ...guardSession,
      attendance: {
        id: "att-1",
        employee_id: "employee-1",
        worksite_id: "worksite-1",
        work_date: today,
        work_intime: `${today}T08:00:00+09:00`,
        work_outtime: `${today}T17:00:00+09:00`,
      },
    };
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(sessionWithAttendance));

    render(<GuardMainPage />);

    expect(await screen.findByText("근무완료")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "금일 근무 완료" })).toBeEnabled();
  });

  it("shows the attendance workflow on the attendance page", async () => {
    const watchPosition = vi.fn();
    const clearWatch = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<AttendancePage />);

    expect(screen.queryByRole("link", { name: "홈으로" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(watchPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 8000,
      });
    });
    expect(screen.queryByRole("button", { name: "현재 위치 가져오기" })).not.toBeInTheDocument();
    expect(screen.getByTestId("clock-in")).toBeInTheDocument();
  });

  it("shows settings guidance on the attendance page when location is blocked", async () => {
    const watchPosition = vi.fn();
    const clearWatch = vi.fn();
    const query = vi.fn(async () => ({ state: "denied" }));

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<AttendancePage />);

    expect(await screen.findByRole("heading", { name: "위치 권한이 필요합니다" })).toBeInTheDocument();
    expect(screen.getByText(/설정에서 위치 권한을 허용/)).toBeInTheDocument();
  });

  it("adds the attendance map section and stable section ids", async () => {
    const watchPosition = vi.fn();
    const clearWatch = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<AttendancePage />);

    expect(screen.getByTestId("attendance-map")).toHaveAttribute("id", "attendance-map-canvas");
    expect(document.getElementById("attendance-map-section")).toBeInTheDocument();
    expect(document.getElementById("attendance-decision-section")).toBeInTheDocument();
    expect(document.getElementById("attendance-actions-section")).toBeInTheDocument();
    expect(document.getElementById("attendance-profile-section")).not.toBeInTheDocument();
    expect(document.getElementById("attendance-current-location-section")).not.toBeInTheDocument();
    expect(document.getElementById("attendance-record-section")).not.toBeInTheDocument();
    expect(screen.getByText("근무지 : 본사")).toBeInTheDocument();
    expect(screen.queryByText(/본사 중심/)).not.toBeInTheDocument();
    expect(screen.queryByText(/현장 위치:/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("현재 위도")).not.toBeInTheDocument();
    expect(screen.queryByText("오늘의 근무 기록")).not.toBeInTheDocument();

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
      setBounds: vi.fn(),
    };
    const markers: unknown[] = [];
    const circles: unknown[] = [];
    const latLngs: Array<{ latitude: number; longitude: number }> = [];
    const boundsExtensions: Array<{ latitude: number; longitude: number }> = [];
    const watchPosition = vi.fn((success: any) => {
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
      } as any);
      return 7;
    });
    const clearWatch = vi.fn();

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch },
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
          LatLngBounds: vi.fn(function LatLngBounds() {
            return {
              extend: vi.fn((position: { latitude: number; longitude: number }) => {
                boundsExtensions.push({ latitude: position.latitude, longitude: position.longitude });
              }),
            };
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
    expect(screen.getByText("나와의 거리 : 104m")).toBeInTheDocument();
    expect(screen.queryByText("근무지")).not.toBeInTheDocument();
    expect(screen.getByText("현재 위치")).toBeInTheDocument();
    expect(screen.getByText("지오펜스 (100m)")).toBeInTheDocument();
    expect(boundsExtensions).toEqual([
      { latitude: 37.5665, longitude: 126.978 },
      { latitude: 37.567, longitude: 126.979 },
    ]);
    expect(map.setBounds).toHaveBeenCalledWith(expect.objectContaining({ extend: expect.any(Function) }));
  });

  it("enables clock-in when watched position enters the worksite radius", async () => {
    let watchSuccess: any = null;
    const watchPosition = vi.fn((success: any) => {
      watchSuccess = success;
      success({
        coords: {
          latitude: 37.57,
          longitude: 126.99,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as any);
      return 11;
    });
    const clearWatch = vi.fn();

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<AttendancePage />);

    expect(await screen.findByRole("button", { name: "출근" })).toBeDisabled();

    watchSuccess?.({
      coords: {
        latitude: 37.5665,
        longitude: 126.978,
        accuracy: 5,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as any);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "출근" })).toBeEnabled();
    });
  });

  it("remeasures the current position when clocking in and posts the fresh coordinates", async () => {
    const user = userEvent.setup();
    const watchPosition = vi.fn((success: any) => {
      success({
        coords: {
          latitude: 37.5665,
          longitude: 126.978,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as any);
      return 12;
    });
    const getCurrentPosition = vi.fn((success: any) => {
      success({
        coords: {
          latitude: 37.5666,
          longitude: 126.9781,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as any);
    });
    const clearWatch = vi.fn();
    const fetch = vi.fn(async () =>
      Response.json({
        attendance: {
          id: "att-1",
          employee_id: "employee-1",
          worksite_id: "worksite-1",
          work_date: "2026-05-24",
          work_intime: "2026-05-24T08:00:00Z",
          work_outtime: null,
        },
      }),
    );

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, getCurrentPosition, clearWatch },
    });
    vi.stubGlobal("fetch", fetch);
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<AttendancePage />);

    await user.click(await screen.findByRole("button", { name: "출근" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/attendance/clock-in",
        expect.objectContaining({
          body: expect.stringContaining('"latitude":"37.5666"'),
        }),
      );
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/attendance/clock-in",
      expect.objectContaining({
        body: expect.stringContaining('"longitude":"126.9781"'),
      }),
    );
  });

  it("adds the unauthenticated attendance section id", () => {
    render(<AttendancePage />);

    expect(document.getElementById("attendance-auth-required-section")).toBeInTheDocument();
  });

  it("shows QR and NFC 청소구역 buttons for role 미화원", async () => {
    const cleanerSession = {
      ...guardSession,
      employee: {
        ...guardSession.employee,
        role: "미화원",
      },
    };
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(cleanerSession));

    render(<GuardMainPage />);

    expect(await screen.findByRole("button", { name: "청소구역(QR코드)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "청소구역(NFC태그)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "순찰(QR코드)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "순찰(NFC태그)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "현장점검" })).not.toBeInTheDocument();
  });

  it("hides inspection button for role 파견", () => {
    const dispatchSession = {
      ...guardSession,
      employee: {
        ...guardSession.employee,
        role: "파견",
      },
    };
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(dispatchSession));

    render(<GuardMainPage />);

    expect(screen.queryByRole("button", { name: "순찰(QR코드)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "순찰(NFC태그)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "청소구역(QR코드)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "청소구역(NFC태그)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "현장점검" })).not.toBeInTheDocument();
  });

  it("hides QR code patrol button by default when USE_QR_CODE config is not Y", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/system/configs/USE_QR_CODE")) {
          return Response.json({ config: { system_code: "USE_QR_CODE", content: "N" } });
        }
        return Response.json({});
      }),
    );
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    expect(screen.queryByRole("button", { name: "순찰(QR코드)" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "순찰(NFC태그)" })).toBeInTheDocument();
  });

  it("shows QR code patrol button when USE_QR_CODE config is Y", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/system/configs/USE_QR_CODE")) {
          return Response.json({ config: { system_code: "USE_QR_CODE", content: "Y" } });
        }
        return Response.json({});
      }),
    );
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    expect(await screen.findByRole("button", { name: "순찰(QR코드)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "순찰(NFC태그)" })).toBeInTheDocument();
  });
});


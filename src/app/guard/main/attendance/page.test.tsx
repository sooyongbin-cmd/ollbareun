import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { guardSessionStorageKey } from "../../guard-session-storage";
import GuardAttendancePage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("./attendance-map-section", () => ({
  default: () => <div data-testid="attendance-map" />,
}));

vi.mock("../guard-location-permission-prompt", () => ({
  default: () => null,
}));

vi.mock("../location-permission", () => ({
  locationPermissionGrantedEvent: "ollbareun:location-permission-granted",
  queryGeolocationPermission: vi.fn(async () => "granted"),
}));

const outsidePosition = {
  coords: {
    latitude: 35.15,
    longitude: 129.08,
    accuracy: 5,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
} as GeolocationPosition;

const inWorksitePosition = {
  coords: {
    latitude: 35.138,
    longitude: 129.064,
    accuracy: 5,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
} as GeolocationPosition;

describe("guard attendance page", () => {
  beforeEach(() => {
    push.mockReset();
    const now = new Date().toISOString();
    window.localStorage.setItem(
      guardSessionStorageKey,
      JSON.stringify({
        employee: {
          id: "emp-1",
          name: "홍길동",
          phone: "010-1234-5678",
          phone_normalized: "01012345678",
          is_retired: false,
        },
        assignment: {
          id: "assignment-1",
          employee_id: "emp-1",
          worksite_id: "site-1",
          start_date: "2026-05-20",
          end_date: "2026-05-20",
        },
        worksite: {
          id: "site-1",
          name: "문현동현장",
          gps_info: { latitude: 35.138, longitude: 129.064 },
          radius_meters: 100,
        },
        attendance: {
          id: "attendance-1",
          employee_id: "emp-1",
          worksite_id: "site-1",
          work_date: "2026-05-20",
          clock_in_at: "2026-05-20T00:00:00Z",
          clock_out_at: null,
        },
        createdAt: now,
        lastActiveAt: now,
      }),
    );

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        clearWatch: vi.fn(),
        getCurrentPosition: vi.fn(),
        watchPosition: vi.fn((success: PositionCallback) => {
          success(outsidePosition);
          return 1;
        }),
      },
    });
  });

  it("disables clock-out when the current position is outside the worksite radius", async () => {
    render(<GuardAttendancePage />);

    expect(await screen.findByText("근무지 반경 100m 이내에서만 퇴근이 가능합니다.")).toBeInTheDocument();
    expect(screen.getByTestId("clock-out")).toBeDisabled();
  });

  it.each([
    {
      action: "clock-in" as const,
      actionLabel: "출근",
      endpoint: "/api/attendance/clock-in",
      attendance: {
        id: "attendance-2",
        employee_id: "emp-1",
        worksite_id: "site-1",
        work_date: "2026-05-20",
        clock_in_at: "2026-05-20T01:00:00Z",
        clock_out_at: null,
      },
      initialAttendance: null,
    },
    {
      action: "clock-out" as const,
      actionLabel: "퇴근",
      endpoint: "/api/attendance/clock-out",
      attendance: {
        id: "attendance-1",
        employee_id: "emp-1",
        worksite_id: "site-1",
        work_date: "2026-05-20",
        clock_in_at: "2026-05-20T00:00:00Z",
        clock_out_at: "2026-05-20T09:00:00Z",
      },
      initialAttendance: {
        id: "attendance-1",
        employee_id: "emp-1",
        worksite_id: "site-1",
        work_date: "2026-05-20",
        clock_in_at: "2026-05-20T00:00:00Z",
        clock_out_at: null,
      },
    },
  ])("returns to guard home after confirming successful $actionLabel", async ({ action, endpoint, attendance, initialAttendance }) => {
    const user = userEvent.setup();
    const watchPosition = vi.fn((success: PositionCallback) => {
      success(inWorksitePosition);
      return 1;
    });
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success(inWorksitePosition);
    });
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/system/configs/system_0001")) {
        return Response.json({});
      }

      return Response.json({ attendance });
    });
    const storedSession = JSON.parse(window.localStorage.getItem(guardSessionStorageKey) ?? "{}");
    storedSession.attendance = initialAttendance;

    window.localStorage.setItem(guardSessionStorageKey, JSON.stringify(storedSession));
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, getCurrentPosition, clearWatch: vi.fn() },
    });
    vi.stubGlobal("fetch", fetch);

    render(<GuardAttendancePage />);

    await user.click(await screen.findByTestId(action));
    expect(await screen.findByRole("heading", { name: action === "clock-in" ? "출근 완료" : "퇴근 완료" })).toBeInTheDocument();
    expect(
      screen.getByText(action === "clock-in" ? "오늘도 안전한 근무되세요" : "오늘 하루도 수고하셨습니다."),
    ).toBeInTheDocument();
    expect(await screen.findByText(`${action === "clock-in" ? "출근" : "퇴근"} 처리가 완료 되었습니다`)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/guard/main");
    });
    expect(fetch).toHaveBeenCalledWith(endpoint, expect.anything());
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        body: expect.stringContaining('"latitude":"35.138"'),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        body: expect.stringContaining('"longitude":"129.064"'),
      }),
    );
  });
});

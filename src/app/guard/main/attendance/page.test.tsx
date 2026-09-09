import { render, screen } from "@testing-library/react";
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

describe("guard attendance page", () => {
  beforeEach(() => {
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
    expect(screen.getByRole("button", { name: "퇴근" })).toBeDisabled();
  });
});

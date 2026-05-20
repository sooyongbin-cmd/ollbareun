import { describe, expect, it } from "vitest";
import {
  authenticateEmployee,
  buildDashboardSummary,
  canClockIn,
  canClockOut,
  isWithinWorksiteRadius,
  normalizePhone,
  type AttendanceRecord,
  type Employee,
  type Worksite,
} from "./phase1";

const employees: Employee[] = [
  { id: "emp-1", name: "홍길동", phone: "010-1234-5678" },
  { id: "emp-2", name: "김영희", phone: "01099998888" },
];

const worksite: Worksite = {
  id: "site-1",
  name: "문현동현장",
  latitude: 35.138,
  longitude: 129.064,
  radiusMeters: 100,
};

describe("Phase 1 employee authentication", () => {
  it("normalizes contact numbers to digits only", () => {
    expect(normalizePhone("010-1234 5678")).toBe("01012345678");
  });

  it("authenticates an employee when name and contact number match", () => {
    expect(authenticateEmployee(employees, " 홍길동 ", "01012345678")).toEqual(
      employees[0],
    );
  });

  it("rejects unknown contact numbers even when the name exists", () => {
    expect(authenticateEmployee(employees, "홍길동", "010-0000-0000")).toBeNull();
  });
});

describe("Phase 1 attendance rules", () => {
  it("allows clock-in inside the assigned worksite radius", () => {
    expect(isWithinWorksiteRadius(worksite, 35.1384, 129.0642)).toBe(true);
    expect(canClockIn({ worksite, currentLatitude: 35.1384, currentLongitude: 129.0642 })).toEqual({
      allowed: true,
      reason: "근무지 반경 안에 있습니다.",
    });
  });

  it("blocks clock-in outside the assigned worksite radius", () => {
    expect(isWithinWorksiteRadius(worksite, 35.15, 129.08)).toBe(false);
    expect(canClockIn({ worksite, currentLatitude: 35.15, currentLongitude: 129.08 })).toEqual({
      allowed: false,
      reason: "근무지 반경 100m 이내에서만 출근이 가능합니다.",
    });
  });

  it("allows clock-out only after clock-in and before existing clock-out", () => {
    expect(canClockOut(undefined)).toEqual({
      allowed: false,
      reason: "출근 기록이 있어야 퇴근할 수 있습니다.",
    });

    expect(canClockOut({ id: "att-1", employeeId: "emp-1", worksiteId: "site-1", clockInAt: "2026-05-20T00:00:00Z" })).toEqual({
      allowed: true,
      reason: "퇴근할 수 있습니다.",
    });

    expect(
      canClockOut({
        id: "att-1",
        employeeId: "emp-1",
        worksiteId: "site-1",
        clockInAt: "2026-05-20T00:00:00Z",
        clockOutAt: "2026-05-20T09:00:00Z",
      }),
    ).toEqual({
      allowed: false,
      reason: "이미 퇴근 처리되었습니다.",
    });
  });
});

describe("Phase 1 admin dashboard summary", () => {
  it("counts total employees and currently clocked-in employees", () => {
    const attendance: AttendanceRecord[] = [
      {
        id: "att-1",
        employeeId: "emp-1",
        worksiteId: "site-1",
        clockInAt: "2026-05-20T00:00:00Z",
      },
      {
        id: "att-2",
        employeeId: "emp-2",
        worksiteId: "site-1",
        clockInAt: "2026-05-20T00:00:00Z",
        clockOutAt: "2026-05-20T09:00:00Z",
      },
    ];

    expect(buildDashboardSummary(employees, attendance)).toEqual({
      totalEmployees: 2,
      currentlyClockedIn: 1,
    });
  });
});

export type Employee = {
  id: string;
  name: string;
  phone: string;
};

export type Worksite = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  worksiteId: string;
  clockInAt: string;
  clockOutAt?: string | null;
};

type Decision = {
  allowed: boolean;
  reason: string;
};

type ClockInInput = {
  worksite: Worksite;
  currentLatitude: number;
  currentLongitude: number;
};

type ClockOutAtWorksiteInput = ClockInInput & {
  attendance?: AttendanceRecord | null;
};

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function authenticateEmployee(
  employees: Employee[],
  name: string,
  phone: string,
): Employee | null {
  const normalizedName = name.trim();
  const normalizedPhone = normalizePhone(phone);

  return (
    employees.find(
      (employee) =>
        employee.name.trim() === normalizedName &&
        normalizePhone(employee.phone) === normalizedPhone,
    ) ?? null
  );
}

export function distanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(fromLatitude);
  const lat2 = toRadians(toLatitude);
  const deltaLat = toRadians(toLatitude - fromLatitude);
  const deltaLon = toRadians(toLongitude - fromLongitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

export function isWithinWorksiteRadius(
  worksite: Worksite,
  currentLatitude: number,
  currentLongitude: number,
): boolean {
  return (
    distanceMeters(
      worksite.latitude,
      worksite.longitude,
      currentLatitude,
      currentLongitude,
    ) <= worksite.radiusMeters
  );
}

export function canClockIn(input: ClockInInput): Decision {
  if (
    isWithinWorksiteRadius(
      input.worksite,
      input.currentLatitude,
      input.currentLongitude,
    )
  ) {
    return { allowed: true, reason: "근무지 반경 안에 있습니다." };
  }

  return {
    allowed: false,
    reason: `근무지 반경 ${input.worksite.radiusMeters}m 이내에서만 출근이 가능합니다.`,
  };
}

export function canClockOut(attendance?: AttendanceRecord | null): Decision {
  if (!attendance?.clockInAt) {
    return {
      allowed: false,
      reason: "출근 기록이 있어야 퇴근할 수 있습니다.",
    };
  }

  if (attendance.clockOutAt) {
    return { allowed: false, reason: "이미 퇴근 처리되었습니다." };
  }

  return { allowed: true, reason: "퇴근할 수 있습니다." };
}

export function canClockOutAtWorksite(input: ClockOutAtWorksiteInput): Decision {
  const attendanceDecision = canClockOut(input.attendance);
  if (!attendanceDecision.allowed) {
    return attendanceDecision;
  }

  if (
    isWithinWorksiteRadius(
      input.worksite,
      input.currentLatitude,
      input.currentLongitude,
    )
  ) {
    return { allowed: true, reason: "근무지 반경 안에 있습니다." };
  }

  return {
    allowed: false,
    reason: `근무지 반경 ${input.worksite.radiusMeters}m 이내에서만 퇴근이 가능합니다.`,
  };
}

export function buildDashboardSummary(
  employees: Employee[],
  attendance: AttendanceRecord[],
) {
  return {
    totalEmployees: employees.length,
    currentlyClockedIn: attendance.filter(
      (record) => record.clockInAt && !record.clockOutAt,
    ).length,
  };
}

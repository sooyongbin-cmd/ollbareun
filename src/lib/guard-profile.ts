import { getSupabase } from "./supabase";

export type GuardProfileScheduleInput = {
  id: string;
  employee_id: string;
  worksite_id: string;
  start_date: string;
  end_date: string;
};

export type GuardProfileWorksiteInput = {
  id: string;
  name: string;
};

export type GuardProfileAttendanceInput = {
  employee_id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
};

export type GuardProfileScheduleRow = {
  id: string;
  period: string;
  worksiteName: string;
};

export type GuardProfileMonthlyAttendanceRow = {
  yearMonth: string;
  attendanceDays: number;
  workHoursTotal: string;
};

export type GuardProfile = {
  schedules: GuardProfileScheduleRow[];
  monthlyAttendance: GuardProfileMonthlyAttendanceRow[];
};

function throwIfError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message ?? "개인프로필을 불러오지 못했습니다.");
  }
}

function requireEmployeeId(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("경비원 정보가 올바르지 않습니다.");
  }

  return value.trim();
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function addUtcYears(dateText: string, years: number) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
}

export function getRecentOneYearDateRange(today = todayDate()) {
  return {
    startDate: addUtcYears(today, -1),
    endDate: today,
  };
}

function durationMinutes(clockInAt: string | null, clockOutAt: string | null) {
  if (!clockInAt || !clockOutAt) {
    return 0;
  }

  const clockIn = new Date(clockInAt).getTime();
  const clockOut = new Date(clockOutAt).getTime();
  if (!Number.isFinite(clockIn) || !Number.isFinite(clockOut) || clockOut < clockIn) {
    return 0;
  }

  return Math.round((clockOut - clockIn) / 60000);
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  if (hours > 0) {
    return `${hours}시간`;
  }
  return `${minutes}분`;
}

export function buildGuardProfile(input: {
  employeeId: string;
  today?: string;
  schedules: GuardProfileScheduleInput[];
  worksites: GuardProfileWorksiteInput[];
  attendance: GuardProfileAttendanceInput[];
}): GuardProfile {
  const { startDate, endDate } = getRecentOneYearDateRange(input.today);
  const worksiteById = new Map(input.worksites.map((worksite) => [worksite.id, worksite.name]));
  const monthlyRows = new Map<string, { attendanceDates: Set<string>; workMinutes: number }>();

  input.attendance
    .filter(
      (record) =>
        record.employee_id === input.employeeId &&
        record.work_date >= startDate &&
        record.work_date <= endDate &&
        Boolean(record.clock_in_at),
    )
    .forEach((record) => {
      const yearMonth = record.work_date.slice(0, 7);
      const monthlyRow = monthlyRows.get(yearMonth) ?? { attendanceDates: new Set<string>(), workMinutes: 0 };
      monthlyRow.attendanceDates.add(record.work_date);
      monthlyRow.workMinutes += durationMinutes(record.clock_in_at, record.clock_out_at);
      monthlyRows.set(yearMonth, monthlyRow);
    });

  return {
    schedules: input.schedules
      .filter((schedule) => schedule.employee_id === input.employeeId)
      .sort((left, right) => left.start_date.localeCompare(right.start_date) || left.end_date.localeCompare(right.end_date))
      .map((schedule) => ({
        id: schedule.id,
        period: `${schedule.start_date} ~ ${schedule.end_date}`,
        worksiteName: worksiteById.get(schedule.worksite_id) ?? "근무지 없음",
      })),
    monthlyAttendance: [...monthlyRows.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([yearMonth, row]) => ({
        yearMonth,
        attendanceDays: row.attendanceDates.size,
        workHoursTotal: formatMinutes(row.workMinutes),
      })),
  };
}

export async function loadGuardProfile(employeeIdInput: unknown) {
  const employeeId = requireEmployeeId(employeeIdInput);
  const { startDate, endDate } = getRecentOneYearDateRange();
  const supabase = getSupabase();

  const [schedulesResult, worksitesResult, attendanceResult] = await Promise.all([
    supabase
      .from("work_assignments")
      .select("id,employee_id,worksite_id,start_date,end_date")
      .eq("employee_id", employeeId)
      .order("start_date", { ascending: true }),
    supabase.from("worksites").select("id,name"),
    supabase
      .from("attendance_records")
      .select("employee_id,work_date,clock_in_at,clock_out_at")
      .eq("employee_id", employeeId)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .order("work_date", { ascending: true }),
  ]);

  throwIfError(schedulesResult.error);
  throwIfError(worksitesResult.error);
  throwIfError(attendanceResult.error);

  return buildGuardProfile({
    employeeId,
    schedules: (schedulesResult.data ?? []) as GuardProfileScheduleInput[],
    worksites: (worksitesResult.data ?? []) as GuardProfileWorksiteInput[],
    attendance: (attendanceResult.data ?? []) as GuardProfileAttendanceInput[],
  });
}

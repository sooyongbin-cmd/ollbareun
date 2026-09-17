import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";

export type GuardProfileScheduleInput = {
  id: string;
  employee_id: string;
  worksite_id: string;
  start_date: string;
  end_date: string;
  in_time?: string | null;
  out_time?: string | null;
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

export type GuardProfileScheduledAttendanceInput = {
  work_assignment_id: string;
  work_date: string;
  intime: string | null;
  outtime: string | null;
};

export type GuardProfileDayOffInput = {
  work_assignment_id: string;
  day_off_date: string;
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

export type GuardProfileAttendanceDetail = {
  workDate: string;
  status: "정상 출근" | "지각 출근" | "출근 중";
  timeRange: string;
};

export type GuardProfileAbsenceDetail = {
  workDate: string;
  reason: "결근" | "휴무";
};

export type GuardProfile = {
  schedules: GuardProfileScheduleRow[];
  monthlyAttendance: GuardProfileMonthlyAttendanceRow[];
  attendanceDetails: GuardProfileAttendanceDetail[];
  absenceDetails: GuardProfileAbsenceDetail[];
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

function formatSeoulTime(value: string | null) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "--";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "--";
  return `${hour}:${minute}`;
}

function seoulTimestamp(workDate: string, time: string) {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return new Date(`${workDate}T${normalizedTime}+09:00`).getTime();
}

function getScheduleForDate(schedules: GuardProfileScheduleInput[], workDate: string) {
  return schedules.find(
    (schedule) => schedule.start_date <= workDate && schedule.end_date >= workDate,
  );
}

export function buildGuardProfile(input: {
  employeeId: string;
  today?: string;
  schedules: GuardProfileScheduleInput[];
  worksites: GuardProfileWorksiteInput[];
  attendance: GuardProfileAttendanceInput[];
  scheduledAttendance?: GuardProfileScheduledAttendanceInput[];
  daysOff?: GuardProfileDayOffInput[];
}): GuardProfile {
  const { startDate, endDate } = getRecentOneYearDateRange(input.today);
  const employeeSchedules = input.schedules.filter((schedule) => schedule.employee_id === input.employeeId);
  const employeeAssignmentIds = new Set(employeeSchedules.map((schedule) => schedule.id));
  const employeeDaysOff = (input.daysOff ?? []).filter((dayOff) => employeeAssignmentIds.has(dayOff.work_assignment_id));
  const worksiteById = new Map(input.worksites.map((worksite) => [worksite.id, worksite.name]));
  const monthlyRows = new Map<string, { attendanceDates: Set<string>; workMinutes: number }>();
  const attendanceForEmployee = input.attendance
    .filter(
      (record) =>
        record.employee_id === input.employeeId &&
        record.work_date >= startDate &&
        record.work_date <= endDate &&
        Boolean(record.clock_in_at),
    )
    .sort((left, right) => left.work_date.localeCompare(right.work_date));

  attendanceForEmployee.forEach((record) => {
      const yearMonth = record.work_date.slice(0, 7);
      const monthlyRow = monthlyRows.get(yearMonth) ?? { attendanceDates: new Set<string>(), workMinutes: 0 };
      monthlyRow.attendanceDates.add(record.work_date);
      monthlyRow.workMinutes += durationMinutes(record.clock_in_at, record.clock_out_at);
      monthlyRows.set(yearMonth, monthlyRow);
  });

  const attendanceDetails = attendanceForEmployee.map((record) => {
    const schedule = getScheduleForDate(input.schedules, record.work_date);
    const expectedInTime = schedule?.in_time;
    const actualInTimestamp = record.clock_in_at ? new Date(record.clock_in_at).getTime() : Number.NaN;
    const expectedInTimestamp = expectedInTime ? seoulTimestamp(record.work_date, expectedInTime) : Number.NaN;
    const isLate = Number.isFinite(actualInTimestamp) && Number.isFinite(expectedInTimestamp)
      ? actualInTimestamp > expectedInTimestamp
      : false;
    const clockIn = formatSeoulTime(record.clock_in_at);
    const clockOut = record.clock_out_at ? formatSeoulTime(record.clock_out_at) : "진행 중";

    return {
      workDate: record.work_date,
      status: record.clock_out_at ? (isLate ? "지각 출근" : "정상 출근") : "출근 중",
      timeRange: `(${clockIn}~${clockOut})`,
    } as GuardProfileAttendanceDetail;
  });

  const actualAttendanceDates = new Set(attendanceForEmployee.map((record) => record.work_date));
  const dayOffDates = new Set(
    employeeDaysOff
      .filter((dayOff) => dayOff.day_off_date >= startDate && dayOff.day_off_date <= endDate)
      .map((dayOff) => dayOff.day_off_date),
  );
  const absenceDetails = [
    ...employeeDaysOff
      .filter((dayOff) => dayOff.day_off_date >= startDate && dayOff.day_off_date <= endDate)
      .map((dayOff) => ({ workDate: dayOff.day_off_date, reason: "휴무" as const })),
    ...(input.scheduledAttendance ?? [])
      .filter(
        (scheduled) =>
          employeeAssignmentIds.has(scheduled.work_assignment_id) &&
          scheduled.work_date >= startDate &&
          scheduled.work_date <= (input.today ?? endDate) &&
          Boolean(scheduled.intime) &&
          !actualAttendanceDates.has(scheduled.work_date) &&
          !dayOffDates.has(scheduled.work_date),
      )
      .map((scheduled) => ({ workDate: scheduled.work_date, reason: "결근" as const })),
  ].sort((left, right) => left.workDate.localeCompare(right.workDate));

  const uniqueAbsenceDetails = absenceDetails.filter(
    (detail, index, details) => index === details.findIndex((candidate) => candidate.workDate === detail.workDate),
  );
  uniqueAbsenceDetails.forEach((detail) => {
    if (!monthlyRows.has(detail.workDate.slice(0, 7))) {
      monthlyRows.set(detail.workDate.slice(0, 7), { attendanceDates: new Set<string>(), workMinutes: 0 });
    }
  });

  return {
    schedules: employeeSchedules
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
    attendanceDetails,
    absenceDetails: uniqueAbsenceDetails,
  };
}

export async function loadGuardProfile(employeeIdInput: unknown) {
  const employeeId = requireEmployeeId(employeeIdInput);
  const { startDate, endDate } = getRecentOneYearDateRange();
  const supabase = getSupabase();

  const [schedulesResult, worksitesResult, attendanceResult] = await Promise.all([
    supabase
      .from("work_assignments")
      .select("id,employee_id,worksite_id,start_date,end_date,in_time,out_time")
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

  const scheduleInputs = (schedulesResult.data ?? []) as GuardProfileScheduleInput[];
  const assignmentIds = scheduleInputs.map((schedule) => schedule.id);
  const scheduleDataClient = getSupabaseAdmin();
  const [scheduledAttendanceResult, daysOffResult] = assignmentIds.length
    ? await Promise.all([
        scheduleDataClient
          .from("work_assignment_daily_attendance")
          .select("work_assignment_id,work_date,intime,outtime")
          .in("work_assignment_id", assignmentIds)
          .order("work_date", { ascending: true }),
        scheduleDataClient
          .from("work_assignment_days_off")
          .select("work_assignment_id,day_off_date")
          .in("work_assignment_id", assignmentIds)
          .order("day_off_date", { ascending: true }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  // These two tables are deliberately optional for older deployments. The profile
  // page can still render attendance summaries when the supporting schedules have
  // not been backfilled yet.
  const scheduledAttendance = scheduledAttendanceResult.error
    ? []
    : (scheduledAttendanceResult.data ?? []) as GuardProfileScheduledAttendanceInput[];
  const daysOff = daysOffResult.error ? [] : (daysOffResult.data ?? []) as GuardProfileDayOffInput[];

  return buildGuardProfile({
    employeeId,
    schedules: scheduleInputs,
    worksites: (worksitesResult.data ?? []) as GuardProfileWorksiteInput[],
    attendance: (attendanceResult.data ?? []) as GuardProfileAttendanceInput[],
    scheduledAttendance,
    daysOff,
  });
}

import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";

type EmployeeInput = {
  id: string;
  name: string;
  is_retired?: boolean;
};

type WorksiteInput = {
  id: string;
  name: string;
};

type AssignmentInput = {
  id?: string;
  employee_id: string;
  worksite_id: string;
  start_date: string;
  end_date: string;
};

type AssignmentDayOffInput = {
  work_assignment_id: string;
  day_off_date: string;
};

type DailyAttendanceInput = {
  work_assignment_id: string;
  work_date: string;
  intime: string | null;
};

type AttendanceInput = {
  employee_id: string;
  worksite_id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
};

type EducationResourceInput = {
  id: string;
};

type EducationCompletionInput = {
  employee_id: string;
  resource_id: string;
  is_completed: boolean;
  completed_at: string | null;
};

export type ManagerDashboardData = {
  summary: {
    scheduledEmployeesToday: number;
    currentlyClockedIn: number;
    waitingEmployeesToday: number;
    absentEmployeesToday: number;
    lateEmployeesToday: number;
    educationUncompleted: number;
  };
  dailyRates: {
    date: string;
    attendanceRate: number;
    educationRate: number;
  }[];
  liveAttendance: {
    employeeName: string;
    worksiteName: string;
    clockInAt: string | null;
    educationStatus: "완료" | "미이수";
    attendanceStatus: "출근" | "퇴근";
  }[];
  worksiteAssignments: {
    worksiteId: string;
    worksiteName: string;
    assignedCount: number;
  }[];
};

type BuildManagerDashboardInput = {
  now?: Date;
  employees: EmployeeInput[];
  worksites: WorksiteInput[];
  assignments: AssignmentInput[];
  attendance: AttendanceInput[];
  dailyAttendance: DailyAttendanceInput[];
  educationResources: EducationResourceInput[];
  educationCompletions: EducationCompletionInput[];
  daysOff?: AssignmentDayOffInput[];
};

function toKstDate(value: Date) {
  const kst = new Date(value.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function inDateRange(date: string, startDate: string, endDate: string) {
  return startDate <= date && date <= endDate;
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function completedResourceIdsByEmployee(completions: EducationCompletionInput[], date?: string) {
  const completedByEmployee = new Map<string, Set<string>>();

  completions.forEach((completion) => {
    if (!completion.is_completed) {
      return;
    }

    if (date && (!completion.completed_at || toKstDate(new Date(completion.completed_at)) > date)) {
      return;
    }

    const completed = completedByEmployee.get(completion.employee_id) ?? new Set<string>();
    completed.add(completion.resource_id);
    completedByEmployee.set(completion.employee_id, completed);
  });

  return completedByEmployee;
}

export function buildManagerDashboardData(input: BuildManagerDashboardInput): ManagerDashboardData {
  const today = toKstDate(input.now ?? new Date());
  const activeEmployees = input.employees.filter((employee) => !employee.is_retired);
  const activeEmployeeIds = new Set(activeEmployees.map((employee) => employee.id));
  const employeeById = new Map(input.employees.map((employee) => [employee.id, employee]));
  const worksiteById = new Map(input.worksites.map((worksite) => [worksite.id, worksite]));
  const todayAttendance = input.attendance.filter(
    (record) => record.work_date === today && activeEmployeeIds.has(record.employee_id) && record.clock_in_at,
  );
  const allResourceIds = input.educationResources.map((resource) => resource.id);
  const completedByEmployee = completedResourceIdsByEmployee(input.educationCompletions);
  const todayDaysOff = new Set(
    (input.daysOff ?? [])
      .filter((dayOff) => dayOff.day_off_date === today)
      .map((dayOff) => dayOff.work_assignment_id),
  );
  const assignmentsById = new Map<string, AssignmentInput>();
  input.assignments.forEach((assignment) => {
    if (assignment.id) {
      assignmentsById.set(assignment.id, assignment);
    }
  });
  const scheduledEmployeeIdsToday = new Set<string>();
  const scheduledClockInsByEmployeeId = new Map<string, number>();
  input.dailyAttendance.forEach((dailyAttendance) => {
    if (dailyAttendance.work_date !== today || !dailyAttendance.intime) {
      return;
    }

    const assignment = assignmentsById.get(dailyAttendance.work_assignment_id);
    if (assignment && activeEmployeeIds.has(assignment.employee_id)) {
      scheduledEmployeeIdsToday.add(assignment.employee_id);
      const scheduledTimestamp = new Date(dailyAttendance.intime).getTime();
      if (
        Number.isFinite(scheduledTimestamp)
        && (!scheduledClockInsByEmployeeId.has(assignment.employee_id)
          || scheduledTimestamp < scheduledClockInsByEmployeeId.get(assignment.employee_id)!)
      ) {
        scheduledClockInsByEmployeeId.set(assignment.employee_id, scheduledTimestamp);
      }
    }
  });
  const todayAttendanceByEmployeeId = new Map(todayAttendance.map((record) => [record.employee_id, record]));
  const nowTimestamp = (input.now ?? new Date()).getTime();
  let waitingEmployeesToday = 0;
  let absentEmployeesToday = 0;
  let lateEmployeesToday = 0;
  scheduledClockInsByEmployeeId.forEach((scheduledTimestamp, employeeId) => {
    const attendance = todayAttendanceByEmployeeId.get(employeeId);
    if (!attendance?.clock_in_at) {
      if (nowTimestamp > scheduledTimestamp) {
        absentEmployeesToday += 1;
      } else {
        waitingEmployeesToday += 1;
      }
      return;
    }

    if (new Date(attendance.clock_in_at).getTime() > scheduledTimestamp) {
      lateEmployeesToday += 1;
    }
  });
  const currentAssignmentCounts = input.assignments
    .filter(
      (assignment) =>
        inDateRange(today, assignment.start_date, assignment.end_date) &&
        (!assignment.id || !todayDaysOff.has(assignment.id)),
    )
    .reduce<Record<string, number>>((counts, assignment) => {
      counts[assignment.worksite_id] = (counts[assignment.worksite_id] ?? 0) + 1;
      return counts;
    }, {});

  const educationUncompleted =
    allResourceIds.length === 0
      ? 0
      : activeEmployees.filter((employee) => {
          const completed = completedByEmployee.get(employee.id);
          return allResourceIds.some((resourceId) => !completed?.has(resourceId));
        }).length;

  const dailyRates = Array.from({ length: 30 }, (_, index) => {
    const date = addDays(today, index - 29);
    const attendanceEmployeeIds = new Set(
      input.attendance
        .filter((record) => record.work_date === date && record.clock_in_at && activeEmployeeIds.has(record.employee_id))
        .map((record) => record.employee_id),
    );
    const completedByDate = completedResourceIdsByEmployee(input.educationCompletions, date);
    const fullyCompletedCount =
      allResourceIds.length === 0
        ? 0
        : activeEmployees.filter((employee) => {
            const completed = completedByDate.get(employee.id);
            return allResourceIds.every((resourceId) => completed?.has(resourceId));
          }).length;

    return {
      date,
      attendanceRate: percent(attendanceEmployeeIds.size, activeEmployees.length),
      educationRate: percent(fullyCompletedCount, activeEmployees.length),
    };
  });

  const liveAttendance = todayAttendance
    .slice()
    .sort((left, right) => String(right.clock_in_at).localeCompare(String(left.clock_in_at)))
    .map((record) => {
      const employee = employeeById.get(record.employee_id);
      const assignedWorksiteId =
        input.assignments.find((assignment) => assignment.employee_id === record.employee_id && inDateRange(today, assignment.start_date, assignment.end_date))
          ?.worksite_id ?? record.worksite_id;
      const completed = completedByEmployee.get(record.employee_id);
      const isCompleted =
        allResourceIds.length === 0 || allResourceIds.every((resourceId) => completed?.has(resourceId));

      return {
        employeeName: employee?.name ?? "직원 없음",
        worksiteName: worksiteById.get(assignedWorksiteId)?.name ?? "현장 없음",
        clockInAt: record.clock_in_at,
        educationStatus: (isCompleted ? "완료" : "미이수") as "완료" | "미이수",
        attendanceStatus: (record.clock_out_at ? "퇴근" : "출근") as "출근" | "퇴근",
      };
    });

  return {
    summary: {
      scheduledEmployeesToday: scheduledEmployeeIdsToday.size,
      currentlyClockedIn: todayAttendance.filter((record) => !record.clock_out_at).length,
      waitingEmployeesToday,
      absentEmployeesToday,
      lateEmployeesToday,
      educationUncompleted,
    },
    dailyRates,
    liveAttendance,
    worksiteAssignments: input.worksites.map((worksite) => ({
      worksiteId: worksite.id,
      worksiteName: worksite.name,
      assignedCount: currentAssignmentCounts[worksite.id] ?? 0,
    })),
  };
}

function throwIfError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message ?? "대시보드 자료를 불러오지 못했습니다.");
  }
}

export async function loadManagerDashboardData() {
  const supabase = getSupabase();
  const supabaseAdmin = getSupabaseAdmin();
  const today = toKstDate(new Date());
  const startDate = addDays(today, -29);

  const [employeesResult, worksitesResult, assignmentsResult, attendanceResult, dailyAttendanceResult, resourcesResult, completionsResult, daysOffResult] =
    await Promise.all([
      supabase.from("employees").select("id,name,is_retired"),
      supabase.from("worksites").select("id,name"),
      supabase.from("work_assignments").select("id,employee_id,worksite_id,start_date,end_date").lte("start_date", today).gte("end_date", startDate),
      supabase.from("attendance_records").select("employee_id,worksite_id,work_date,clock_in_at,clock_out_at").gte("work_date", startDate).lte("work_date", today),
      supabaseAdmin
        .from("work_assignment_daily_attendance")
        .select("work_assignment_id,work_date,intime")
        .eq("work_date", today)
        .not("intime", "is", null),
      supabase.from("education_resources").select("id"),
      supabase.from("education_completions").select("employee_id,resource_id,is_completed,completed_at"),
      supabaseAdmin
        .from("work_assignment_days_off")
        .select("work_assignment_id,day_off_date")
        .eq("day_off_date", today),
    ]);

  throwIfError(employeesResult.error);
  throwIfError(worksitesResult.error);
  throwIfError(assignmentsResult.error);
  throwIfError(attendanceResult.error);
  throwIfError(dailyAttendanceResult.error);
  throwIfError(resourcesResult.error);
  throwIfError(completionsResult.error);
  throwIfError(daysOffResult.error);

  return buildManagerDashboardData({
    employees: employeesResult.data ?? [],
    worksites: worksitesResult.data ?? [],
    assignments: assignmentsResult.data ?? [],
    attendance: attendanceResult.data ?? [],
    dailyAttendance: dailyAttendanceResult.data ?? [],
    educationResources: resourcesResult.data ?? [],
    educationCompletions: completionsResult.data ?? [],
    daysOff: daysOffResult.data ?? [],
  });
}

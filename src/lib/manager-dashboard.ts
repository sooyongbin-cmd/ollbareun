import { getSupabaseAdmin } from "./supabase-admin";
import { getManagerAttendanceStatus } from "./manager-attendance-status";

type EmployeeInput = {
  id: string;
  name: string;
  role?: "경비원" | "미화원" | "파견";
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
  id?: string;
  employee_id: string;
  worksite_id: string;
  work_date: string;
  intime: string | null;
};

type IntimeStatus = "0" | "1" | "2" | "3";

type AttendanceInput = {
  employee_id: string;
  worksite_id: string;
  work_date: string;
  intime?: string | null;
  intime_status: IntimeStatus;
  work_intime: string | null;
  work_outtime: string | null;
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

type SpecialRemarkInput = {
  processing_status?: "Y" | "N";
};

type InspectionSiteInput = {
  id: string;
  worksite_id: string;
};

type InspectionLogInput = {
  inspection_site_id: string | null;
  worksite_id: string | null;
};

export type ManagerDashboardData = {
  summary: {
    scheduledEmployeesToday: number;
    currentlyClockedIn: number;
    onTimeEmployeesToday: number;
    waitingEmployeesToday: number;
    absentEmployeesToday: number;
    lateEmployeesToday: number;
    educationUncompleted: number;
    educationRate: number;
    employeeRoleCounts: {
      guard: number;
      cleaner: number;
      dispatched: number;
    };
    unprocessedSpecialRemarks: number;
  };
  liveAttendance: {
    employeeName: string;
    worksiteName: string;
    clockInAt: string | null;
    educationStatus: "완료" | "미이수";
    attendanceStatus: "출근" | "퇴근";
  }[];
  worksiteMonitoring: {
    worksiteId: string;
    employeeRole: "경비원" | "미화원" | "파견";
    worksiteName: string;
    attendanceCount: number;
    assignedCount: number;
    inspectedSiteCount: number;
    inspectionSiteCount: number;
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
  specialRemarkReports?: SpecialRemarkInput[];
  inspectionSites?: InspectionSiteInput[];
  inspectionLogs?: InspectionLogInput[];
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

function completedResourceIdsByEmployee(completions: EducationCompletionInput[]) {
  const completedByEmployee = new Map<string, Set<string>>();

  completions.forEach((completion) => {
    if (!completion.is_completed) {
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
  const employeeRoleCounts = {
    guard: 0,
    cleaner: 0,
    dispatched: 0,
  };

  activeEmployees.forEach((employee) => {
    if (employee.role === "경비원") {
      employeeRoleCounts.guard += 1;
    } else if (employee.role === "미화원") {
      employeeRoleCounts.cleaner += 1;
    } else if (employee.role === "파견") {
      employeeRoleCounts.dispatched += 1;
    }
  });
  const todayWorkRecords = input.attendance.filter(
    (record) => record.work_date === today && activeEmployeeIds.has(record.employee_id),
  );
  const todayAttendance = todayWorkRecords.filter((record) => record.work_intime);
  const allResourceIds = input.educationResources.map((resource) => resource.id);
  const completedByEmployee = completedResourceIdsByEmployee(input.educationCompletions);
  const todayDaysOff = new Set(
    (input.daysOff ?? [])
      .filter((dayOff) => dayOff.day_off_date === today)
      .map((dayOff) => dayOff.work_assignment_id),
  );
  const scheduledEmployeeIdsToday = new Set<string>();
  input.dailyAttendance.forEach((dailyAttendance) => {
    if (dailyAttendance.work_date !== today || !dailyAttendance.intime) {
      return;
    }

    if (activeEmployeeIds.has(dailyAttendance.employee_id)) {
      scheduledEmployeeIdsToday.add(dailyAttendance.employee_id);
    }
  });
  const scheduledTimes = new Map<string, string | null>();
  input.dailyAttendance.forEach((dailyAttendance) => {
    scheduledTimes.set(
      `${dailyAttendance.employee_id}:${dailyAttendance.worksite_id}:${dailyAttendance.work_date}`,
      dailyAttendance.intime,
    );
  });
  let onTimeEmployeesToday = 0;
  let waitingEmployeesToday = 0;
  let absentEmployeesToday = 0;
  let lateEmployeesToday = 0;
  todayWorkRecords.forEach((record) => {
    const status = getManagerAttendanceStatus({
      intimeStatus: record.intime_status,
      scheduledClockIn: scheduledTimes.get(`${record.employee_id}:${record.worksite_id}:${record.work_date}`) ?? record.intime,
      now: input.now ?? new Date(),
    });
    switch (status) {
      case "대기":
        waitingEmployeesToday += 1;
        break;
      case "결근":
        absentEmployeesToday += 1;
        break;
      case "지각":
        lateEmployeesToday += 1;
        break;
      case "출근":
        onTimeEmployeesToday += 1;
        break;
    }
  });
  const currentAssignments = input.assignments
    .filter(
      (assignment) =>
        inDateRange(today, assignment.start_date, assignment.end_date) &&
        activeEmployeeIds.has(assignment.employee_id) &&
        (!assignment.id || !todayDaysOff.has(assignment.id)),
    );

  const educationUncompleted =
    allResourceIds.length === 0
      ? 0
      : activeEmployees.filter((employee) => {
          const completed = completedByEmployee.get(employee.id);
          return allResourceIds.some((resourceId) => !completed?.has(resourceId));
        }).length;
  const educationRate =
    allResourceIds.length === 0
      ? 0
      : percent(
          activeEmployees.filter((employee) => {
            const completed = completedByEmployee.get(employee.id);
            return allResourceIds.every((resourceId) => completed?.has(resourceId));
          }).length,
          activeEmployees.length,
        );

  const unprocessedSpecialRemarks = (input.specialRemarkReports ?? []).filter(
    (report) => report.processing_status !== "Y",
  ).length;

  const monitoringByRoleAndWorksite = new Map<
    string,
    {
      worksiteId: string;
      employeeRole: "경비원" | "미화원" | "파견";
      assignedCount: number;
      attendanceCount: number;
    }
  >();
  currentAssignments.forEach((assignment) => {
    const employeeRole = employeeById.get(assignment.employee_id)?.role;
    if (!employeeRole) {
      return;
    }

    const key = `${employeeRole}:${assignment.worksite_id}`;
    const current = monitoringByRoleAndWorksite.get(key) ?? {
      worksiteId: assignment.worksite_id,
      employeeRole,
      assignedCount: 0,
      attendanceCount: 0,
    };
    current.assignedCount += 1;
    monitoringByRoleAndWorksite.set(key, current);
  });

  const countedAttendance = new Set<string>();
  todayAttendance.forEach((record) => {
    const employeeRole = employeeById.get(record.employee_id)?.role;
    if (!employeeRole) {
      return;
    }

    const key = `${employeeRole}:${record.worksite_id}`;
    const attendanceKey = `${key}:${record.employee_id}`;
    const current = monitoringByRoleAndWorksite.get(key);
    if (!current || countedAttendance.has(attendanceKey)) {
      return;
    }

    current.attendanceCount += 1;
    countedAttendance.add(attendanceKey);
  });

  const inspectionSiteWorksiteById = new Map(
    (input.inspectionSites ?? []).map((site) => [site.id, site.worksite_id]),
  );
  const inspectionSiteCountByWorksite = new Map<string, number>();
  (input.inspectionSites ?? []).forEach((site) => {
    inspectionSiteCountByWorksite.set(
      site.worksite_id,
      (inspectionSiteCountByWorksite.get(site.worksite_id) ?? 0) + 1,
    );
  });
  const inspectedSiteIdsByWorksite = new Map<string, Set<string>>();
  (input.inspectionLogs ?? []).forEach((log) => {
    if (!log.inspection_site_id) {
      return;
    }

    const worksiteId = inspectionSiteWorksiteById.get(log.inspection_site_id) ?? log.worksite_id;
    if (!worksiteId) {
      return;
    }

    const inspectedSiteIds = inspectedSiteIdsByWorksite.get(worksiteId) ?? new Set<string>();
    inspectedSiteIds.add(log.inspection_site_id);
    inspectedSiteIdsByWorksite.set(worksiteId, inspectedSiteIds);
  });

  const worksiteMonitoring = Array.from(monitoringByRoleAndWorksite.values()).map((row) => ({
    ...row,
    worksiteName: worksiteById.get(row.worksiteId)?.name ?? "현장 없음",
    inspectedSiteCount: inspectedSiteIdsByWorksite.get(row.worksiteId)?.size ?? 0,
    inspectionSiteCount: inspectionSiteCountByWorksite.get(row.worksiteId) ?? 0,
  }));

  const liveAttendance = todayAttendance
    .slice()
    .sort((left, right) => String(right.work_intime).localeCompare(String(left.work_intime)))
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
        clockInAt: record.work_intime,
        educationStatus: (isCompleted ? "완료" : "미이수") as "완료" | "미이수",
        attendanceStatus: (record.work_outtime ? "퇴근" : "출근") as "출근" | "퇴근",
      };
    });

  return {
    summary: {
      scheduledEmployeesToday: scheduledEmployeeIdsToday.size,
      currentlyClockedIn: todayAttendance.filter((record) => !record.work_outtime).length,
      onTimeEmployeesToday,
      waitingEmployeesToday,
      absentEmployeesToday,
      lateEmployeesToday,
      educationUncompleted,
      educationRate,
      employeeRoleCounts,
      unprocessedSpecialRemarks,
    },
    liveAttendance,
    worksiteMonitoring: worksiteMonitoring.sort((left, right) => {
      const worksiteComparison = left.worksiteName.localeCompare(right.worksiteName, "ko-KR");
      if (worksiteComparison !== 0) {
        return worksiteComparison;
      }

      return ["경비원", "미화원", "파견"].indexOf(left.employeeRole) - ["경비원", "미화원", "파견"].indexOf(right.employeeRole);
    }),
  };
}

function throwIfError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message ?? "대시보드 자료를 불러오지 못했습니다.");
  }
}

export async function loadManagerDashboardData() {
  // The manager dashboard is loaded through a Route Handler. The publishable
  // client does not inherit the browser's auth cookies there, so use the
  // server-side client after the route has verified manager access.
  const supabase = getSupabaseAdmin();
  const today = toKstDate(new Date());
  const tomorrow = addDays(today, 1);
  const todayStart = `${today}T00:00:00+09:00`;
  const tomorrowStart = `${tomorrow}T00:00:00+09:00`;

  const [employeesResult, worksitesResult, assignmentsResult, workRecordResult, resourcesResult, completionsResult, daysOffResult, specialRemarksResult, inspectionSitesResult, inspectionLogsResult] =
    await Promise.all([
      supabase.from("employees").select("id,name,role,is_retired"),
      supabase.from("worksites").select("id,name"),
      supabase.from("work_assignments").select("id,employee_id,worksite_id,start_date,end_date").lte("start_date", today).gte("end_date", today),
      supabase.from("work_record").select("id,employee_id,worksite_id,work_date,intime,work_intime,work_outtime,intime_status").eq("work_date", today),
      supabase.from("education_resources").select("id"),
      supabase.from("education_completions").select("employee_id,resource_id,is_completed,completed_at"),
      supabase
        .from("work_assignment_days_off")
        .select("work_assignment_id,day_off_date")
        .eq("day_off_date", today),
      supabase.from("inspection_special_reports").select("processing_status"),
      supabase.from("inspection_sites").select("id,worksite_id"),
      supabase
        .from("inspection_logs")
        .select("inspection_site_id,worksite_id")
        .gte("inspected_at", todayStart)
        .lt("inspected_at", tomorrowStart),
    ]);

  throwIfError(employeesResult.error);
  throwIfError(worksitesResult.error);
  throwIfError(assignmentsResult.error);
  throwIfError(workRecordResult.error);
  throwIfError(resourcesResult.error);
  throwIfError(completionsResult.error);
  throwIfError(daysOffResult.error);
  throwIfError(specialRemarksResult.error);
  throwIfError(inspectionSitesResult.error);
  throwIfError(inspectionLogsResult.error);

  return buildManagerDashboardData({
    employees: employeesResult.data ?? [],
    worksites: worksitesResult.data ?? [],
    assignments: assignmentsResult.data ?? [],
    attendance: workRecordResult.data ?? [],
    dailyAttendance: (workRecordResult.data ?? []).filter((record) => record.work_date === today && record.intime),
    educationResources: resourcesResult.data ?? [],
    educationCompletions: completionsResult.data ?? [],
    daysOff: daysOffResult.data ?? [],
    specialRemarkReports: specialRemarksResult.data ?? [],
    inspectionSites: inspectionSitesResult.data ?? [],
    inspectionLogs: inspectionLogsResult.data ?? [],
  });
}

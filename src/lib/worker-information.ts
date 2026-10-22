import { readAllEducationRows } from "./education-completions";
import {
  educationTypeLabels,
  educationTypes,
  isEducationResourceForDate,
  requireEducationResourceDates,
} from "./education-periods";
import {
  getManagerAttendanceStatus,
  type ManagerIntimeStatus,
} from "./manager-attendance-status";
import {
  employeeScheduleRules,
  elapsedTime,
  scheduleDayLabels,
  isScheduleDayOff,
  weekDays,
  type ScheduleRule,
  type ScheduleDayType,
} from "./employee-schedule";
import { getSupabaseAdmin } from "./supabase-admin";

export type WorkerEmployee = {
  id: string;
  name: string;
  birthdate: string;
  role: string;
  phone: string;
  in_time: string;
  out_time: number;
  has_weekend: boolean;
  schedule_rules_enabled?: boolean;
  schedule_rules?: ScheduleRule[];
};
type WorkRecord = {
  id: string;
  employee_id: string;
  work_date: string;
  intime: string | null;
  outtime: string | null;
  intime_status: ManagerIntimeStatus;
  outtime_status: string;
  work_intime: string | null;
  work_outtime: string | null;
};
type Resource = {
  id: string;
  title: string;
  education_type: string;
  startdate: string;
  enddate: string;
};
type Completion = {
  employee_id: string;
  work_date: string;
  title: string;
  education_type: string;
};
type Leave = {
  employee_id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
};
type Assignment = {
  id: string;
  employee_id: string;
  worksite_id: string;
  start_date: string;
  end_date: string;
};
export type WorkerInformationRow = WorkerEmployee & {
  worksite: string;
  clockIn: string;
  clockOut: string;
  daysOff: string;
  attendance: Record<"결근" | "조퇴" | "지각" | "연차" | "휴가", number>;
  education: { label: string; completed: number; total: number }[];
  remarks: number;
};

export function workerSchedule(employee: WorkerEmployee) {
  const rules = employeeScheduleRules(employee);
  const workingRules = rules.filter((rule) => rule.is_working_day);
  const times = (out: boolean) =>
    [
      out ? elapsedTime(employee.out_time) : employee.in_time.slice(0, 5),
      ...workingRules.map(
        (rule) =>
          `${scheduleDayLabels[rule.day_type]} ${out ? elapsedTime(rule.out_time!) : rule.in_time?.slice(0, 5)}`,
      ),
    ].join(" · ");
  const days: ScheduleDayType[] = [...weekDays, "holiday"];
  return {
    clockIn: times(false),
    clockOut: times(true),
    daysOff:
      days
        .filter((day) => isScheduleDayOff(rules, day))
        .map((day) => scheduleDayLabels[day])
        .join(", ") || "없음",
  };
}

export function buildWorkerInformation(input: {
  employees: WorkerEmployee[];
  assignments: Assignment[];
  worksites: { id: string; name: string }[];
  records: WorkRecord[];
  resources: Resource[];
  completions: Completion[];
  leaves: Leave[];
  reports: { employee_id: string }[];
  now?: Date;
}): WorkerInformationRow[] {
  const now = input.now ?? new Date();
  const completed = new Set(
    input.completions.map((c) =>
      JSON.stringify([c.employee_id, c.work_date, c.title, c.education_type]),
    ),
  );
  const anyCompleted = new Set(
    input.completions.map((c) =>
      JSON.stringify([c.employee_id, c.title, c.education_type]),
    ),
  );
  const reports = new Map<string, number>();
  input.reports.forEach((report) =>
    reports.set(report.employee_id, (reports.get(report.employee_id) ?? 0) + 1),
  );
  const recordsByEmployee = new Map<string, WorkRecord[]>();
  input.records.forEach((record) => {
    const records = recordsByEmployee.get(record.employee_id) ?? [];
    records.push(record);
    recordsByEmployee.set(record.employee_id, records);
  });
  return input.employees
    .map((employee) => {
      const records = recordsByEmployee.get(employee.id) ?? [];
      const attendance = { 결근: 0, 조퇴: 0, 지각: 0, 연차: 0, 휴가: 0 };
      records.forEach((record) => {
        const status = getManagerAttendanceStatus({
          intimeStatus: record.intime_status,
          scheduledClockIn: record.intime,
          now,
        });
        const leave = input.leaves.find(
          (leave) =>
            leave.employee_id === employee.id &&
            leave.start_date <= record.work_date &&
            record.work_date <= leave.end_date,
        );
        if (status === "휴가" || leave)
          attendance[leave?.leave_type === "연차" ? "연차" : "휴가"]++;
        else {
          if (status === "결근" || status === "지각") attendance[status]++;
          if (
            (status === "출근" || status === "지각") &&
            record.outtime_status === "1"
          )
            attendance.조퇴++;
        }
      });
      // Daily education uses actual work dates, matching the monthly education detail table.
      const workDates = [
        ...new Set(
          records
            .filter((record) => record.work_intime)
            .map((record) => record.work_date),
        ),
      ];
      const education = educationTypes.map((type) => {
        const resources = input.resources.filter(
          (resource) => resource.education_type === educationTypeLabels[type],
        );
        let total = 0,
          count = 0;
        resources.forEach((resource) => {
          if (type === "daily")
            workDates
              .filter((date) => isEducationResourceForDate(resource, date))
              .forEach((date) => {
                total++;
                if (
                  completed.has(
                    JSON.stringify([
                      employee.id,
                      date,
                      resource.title,
                      resource.education_type,
                    ]),
                  )
                )
                  count++;
              });
          else {
            total++;
            if (
              anyCompleted.has(
                JSON.stringify([
                  employee.id,
                  resource.title,
                  resource.education_type,
                ]),
              )
            )
              count++;
          }
        });
        return { label: educationTypeLabels[type], completed: count, total };
      });
      const assignment = input.assignments.find(
        (assignment) => assignment.employee_id === employee.id,
      );
      return {
        ...employee,
        ...workerSchedule(employee),
        worksite:
          input.worksites.find((site) => site.id === assignment?.worksite_id)
            ?.name ?? "",
        attendance,
        education,
        remarks: reports.get(employee.id) ?? 0,
      };
    })
    .sort(
      (a, b) =>
        a.worksite.localeCompare(b.worksite, "ko-KR") ||
        a.name.localeCompare(b.name, "ko-KR") ||
        a.id.localeCompare(b.id),
    );
}

export async function loadWorkerInformation(start: string, end: string) {
  requireEducationResourceDates(start, end);
  const db = getSupabaseAdmin();
  const read = readAllEducationRows;
  const next = new Date(`${end}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const [
    employees,
    assignments,
    worksites,
    records,
    resources,
    completions,
    leaves,
    reports,
  ] = await Promise.all([
    read<WorkerEmployee>((from, to) =>
      db
        .from("employees")
        .select(
          "id,name,birthdate,role,phone,in_time,out_time,has_weekend,schedule_rules_enabled,schedule_rules:employee_schedule_rules(day_type,is_working_day,in_time,out_time)",
        )
        .eq("is_retired", false)
        .order("id")
        .range(from, to),
    ),
    // Use the same current assignment selection as the employee roster.
    read<Assignment>((from, to) =>
      db
        .from("work_assignments")
        .select("id,employee_id,worksite_id,start_date,end_date")
        .lte(
          "start_date",
          new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }),
        )
        .gte(
          "end_date",
          new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }),
        )
        .order("created_at", { ascending: true })
        .order("id")
        .range(from, to),
    ),
    read<{ id: string; name: string }>((from, to) =>
      db.from("worksites").select("id,name").order("id").range(from, to),
    ),
    read<WorkRecord>((from, to) =>
      db
        .from("work_record")
        .select(
          "id,employee_id,work_date,intime,outtime,intime_status,outtime_status,work_intime,work_outtime",
        )
        .gte("work_date", start)
        .lte("work_date", end)
        .order("id")
        .range(from, to),
    ),
    read<Resource>((from, to) =>
      db
        .from("education_resources")
        .select("id,title,education_type,startdate,enddate")
        .lte("startdate", end)
        .gte("enddate", start)
        .order("id")
        .range(from, to),
    ),
    read<Completion>((from, to) =>
      db
        .from("education_completions")
        .select("employee_id,work_date,title,education_type")
        .gte("work_date", start)
        .lte("work_date", end)
        .order("id")
        .range(from, to),
    ),
    read<Leave>((from, to) =>
      db
        .from("leave")
        .select("employee_id,start_date,end_date,leave_type")
        .lte("start_date", end)
        .gte("end_date", start)
        .order("id")
        .range(from, to),
    ),
    read<{ employee_id: string }>((from, to) =>
      db
        .from("inspection_special_reports")
        .select("employee_id")
        .gte("reported_at", `${start}T00:00:00+09:00`)
        .lt("reported_at", `${next.toISOString().slice(0, 10)}T00:00:00+09:00`)
        .order("id")
        .range(from, to),
    ),
  ]);
  return buildWorkerInformation({
    employees,
    assignments,
    worksites,
    records,
    resources,
    completions,
    leaves,
    reports,
  });
}

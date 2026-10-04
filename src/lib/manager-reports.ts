import { readAllEducationRows } from "./education-completions";
import { saveAttendance } from "./attendance";
import type { SupabaseClient } from "@supabase/supabase-js";
import { durationLabel } from "./work-duration";
import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";
import { getManagerAttendanceStatus } from "./manager-attendance-status";
import { deriveAttendanceStatuses } from "./attendance-status";

type EmployeeInput = {
  id: string;
  name: string;
  role?: string | null;
  work_style?: "0" | "1" | "2" | null;
  is_retired?: boolean;
};

type IntimeStatus = "0" | "1" | "2" | "3";
type OuttimeStatus = "0" | "1" | "2";
type AttendanceReportStatus = "결근" | "지각" | "출근" | "대기" | "휴가";

const intimeStatusLabels: Record<IntimeStatus, Exclude<AttendanceReportStatus, "대기">> = {
  "0": "결근",
  "1": "지각",
  "2": "출근",
  "3": "휴가",
};

type AttendanceInput = {
  id: string;
  worksite_id?: string | null;
  employee_id: string;
  work_date: string;
  intime?: string | null;
  outtime?: string | null;
  intime_status?: IntimeStatus | null;
  outtime_status?: OuttimeStatus | null;
  work_intime: string | null;
  work_outtime: string | null;
};

type AssignmentInput = {
  id: string;
  employee_id: string;
  worksite_id: string;
};

type DailyAttendanceInput = {
  id?: string;
  employee_id: string;
  worksite_id: string;
  work_date: string;
  intime: string | null;
  outtime?: string | null;
};

type ResourceInput = {
  id: string;
};

type CompletionInput = {
  education_date?: string | null;
  employee_id: string;
  resource_id: string;
  is_completed: boolean;
  completed_at: string | null;
};

export type AttendanceReportRow = {
  id: string;
  workDate: string;
  worksiteName: string;
  employeeName: string;
  employeeRole: string;
  workStyle: string;
  scheduledClockIn: string;
  scheduledClockOut: string;
  clockInDateTime: string;
  clockOutDateTime: string | null;
  workDuration: string;
  intimeStatus: IntimeStatus;
  status: AttendanceReportStatus;
  outtimeStatus: OuttimeStatus;
  outtimeLabel: "" | "미퇴근" | "조퇴" | "퇴근";
  isLate: boolean;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  worksiteName: string;
  workDate: string;
  workStyle: string;
  scheduledClockIn: string;
  scheduledClockOut: string;
  status: string;
  intimeStatus: IntimeStatus;
  outtimeStatus: OuttimeStatus;
  outtimeLabel: "미퇴근" | "조퇴" | "퇴근";
  employeeName: string;
  clockInDateTime: string;
  clockOutDateTime: string | null;
};

export type EducationReportRow = {
  employeeName: string;
  completedCount: number;
  totalCount: number;
};

function throwIfError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message ?? "리포트 자료를 불러오지 못했습니다.");
  }
}

function toKstDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return {
    date: kst.toISOString().slice(0, 10),
    time: kst.toISOString().slice(11, 16),
    dateTime: `${kst.toISOString().slice(0, 10)} ${kst.toISOString().slice(11, 16)}`,
    timestamp: date.getTime(),
  };
}

function assertYear(year: string) {
  if (!/^\d{4}$/.test(year)) {
    throw new Error("연도는 4자리 숫자로 입력하세요.");
  }
}

function workStyleLabel(workStyle: EmployeeInput["work_style"]) {
  return workStyle === "0" ? "일반근무" : workStyle === "1" ? "격일근무" : workStyle === "2" ? "야간근무" : "-";
}

function getAttendanceReportStatus(input: {
  intimeStatus: IntimeStatus;
  scheduledClockIn: string | null;
  now: Date;
}): AttendanceReportStatus {
  const attendanceStatus = getManagerAttendanceStatus(input);
  if (attendanceStatus === "대기") {
    return "대기";
  }

  return intimeStatusLabels[input.intimeStatus];
}

export function buildAttendanceReport(input: {
  employeeName: string;
  workDate: string;
  employees: EmployeeInput[];
  attendance: AttendanceInput[];
  worksites?: { id: string; name: string }[];
  assignments?: AssignmentInput[];
  dailyAttendance?: DailyAttendanceInput[];
  now?: Date;
}): AttendanceReportRow[] {
  assertDate(input.workDate);
  const nowTimestamp = (input.now ?? new Date()).getTime();
  const query = input.employeeName.trim().toLowerCase();
  const employeeIds = new Set(
    input.employees
      .filter((employee) => employee.name.toLowerCase().includes(query))
      .map((employee) => employee.id),
  );
  const employeeNamesById = new Map(input.employees.map((employee) => [employee.id, employee.name]));
  const employeeRolesById = new Map(input.employees.map((employee) => [employee.id, employee.role ?? "-"]));
  const workStylesByEmployeeId = new Map(input.employees.map((employee) => [employee.id, workStyleLabel(employee.work_style)]));
  const worksiteNamesById = new Map((input.worksites ?? []).map((worksite) => [worksite.id, worksite.name]));
  const scheduledTimes = new Map<string, { intime: string | null; outtime: string | null }>();

  (input.dailyAttendance ?? []).forEach((dailyAttendance) => {
    scheduledTimes.set(
      `${dailyAttendance.employee_id}:${dailyAttendance.worksite_id}:${dailyAttendance.work_date}`,
      { intime: dailyAttendance.intime, outtime: dailyAttendance.outtime ?? null },
    );
  });

  return input.attendance
    .filter((record) => (
      (record.work_date === input.workDate || toKstDateTime(record.outtime ?? null)?.date === input.workDate) &&
      employeeIds.has(record.employee_id)
    ))
    .map((record) => {
      const scheduledTime = scheduledTimes.get(
        `${record.employee_id}:${record.worksite_id ?? ""}:${record.work_date}`,
      );
      const intimeStatus = record.intime_status ?? "0";
      const outtimeStatus = record.outtime_status ?? "0";
      const scheduledClockInAt = scheduledTime?.intime ?? record.intime ?? null;
      const status = getAttendanceReportStatus({
        intimeStatus,
        scheduledClockIn: scheduledClockInAt,
        now: input.now ?? new Date(nowTimestamp),
      });
      const scheduledClockOut = toKstDateTime(scheduledTime?.outtime ?? record.outtime ?? null);
      const hideOuttimeStatus = status === "대기" || status === "결근" || status === "휴가" || (
        outtimeStatus === "0" && scheduledClockOut !== null && nowTimestamp < scheduledClockOut.timestamp
      );
      const outtimeLabel: AttendanceReportRow["outtimeLabel"] = hideOuttimeStatus
        ? ""
        : outtimeStatus === "1"
          ? "조퇴"
          : outtimeStatus === "2"
            ? "퇴근"
            : "미퇴근";

      return {
        id: record.id,
        workDate: record.work_date,
        worksiteName: worksiteNamesById.get(record.worksite_id ?? "") ?? "-",
        employeeName: employeeNamesById.get(record.employee_id) ?? "-",
        employeeRole: employeeRolesById.get(record.employee_id) ?? "-",
        workStyle: workStylesByEmployeeId.get(record.employee_id) ?? "-",
        scheduledClockIn: toKstDateTime(scheduledClockInAt)?.time ?? "-",
        scheduledClockOut: scheduledClockOut?.dateTime ?? "-",
        clockInDateTime: toKstDateTime(record.work_intime)?.dateTime ?? "-",
        clockOutDateTime: toKstDateTime(record.work_outtime)?.dateTime ?? null,
        workDuration: durationLabel(record.work_intime, record.work_outtime),
        intimeStatus,
        status,
        outtimeStatus,
        outtimeLabel,
        isLate: intimeStatus === "1",
      };
    })
    .sort((left, right) =>
      left.workDate.localeCompare(right.workDate) ||
      left.scheduledClockIn.localeCompare(right.scheduledClockIn) ||
      left.scheduledClockOut.localeCompare(right.scheduledClockOut),
    );
}

function assertDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("날짜를 올바르게 입력하세요.");
  }

  const parsed = new Date(`${date}T00:00:00+09:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("날짜를 올바르게 입력하세요.");
  }

  const normalized = toKstDateTime(parsed.toISOString())?.date;
  if (normalized !== date) {
    throw new Error("날짜를 올바르게 입력하세요.");
  }
}

function kstDateTimeLocalToIso(value: unknown, label: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error(`${label}를 올바르게 입력하세요.`);
  }

  const date = new Date(`${value}:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label}를 올바르게 입력하세요.`);
  }

  const normalizedKstValue = new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
  if (normalizedKstValue !== value) {
    throw new Error(`${label}를 올바르게 입력하세요.`);
  }

  return date.toISOString();
}

export async function updateAttendanceRecord(input: {
  recordId: unknown;
  clockInDateTime: unknown;
  clockOutDateTime?: unknown;
}) {
  if (typeof input.recordId !== "string" || !input.recordId.trim()) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }

  const hasClockIn = typeof input.clockInDateTime === "string" && input.clockInDateTime.trim() !== "";
  const hasClockOut = typeof input.clockOutDateTime === "string" && input.clockOutDateTime.trim() !== "";
  if (!hasClockIn && !hasClockOut) throw new Error("출근일시 또는 퇴근일시를 입력하세요.");
  const clockInAt = hasClockIn ? kstDateTimeLocalToIso(input.clockInDateTime, "출근일시") : undefined;
  const clockOutAt = hasClockOut ? kstDateTimeLocalToIso(input.clockOutDateTime, "퇴근일시") : undefined;

  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("work_record")
    .select("id,intime,outtime,work_intime,work_outtime,intime_status,outtime_status")
    .eq("id", input.recordId)
    .single();
  throwIfError(existingError);
  if (!existing) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }

  const nextWorkIn = clockInAt ?? existing.work_intime;
  const nextWorkOuttime = clockOutAt ?? existing.work_outtime;
  if (nextWorkOuttime && !nextWorkIn) throw new Error("퇴근일시를 저장하려면 출근일시가 먼저 등록되어야 합니다.");
  if (nextWorkOuttime && nextWorkIn && new Date(nextWorkOuttime).getTime() < new Date(nextWorkIn).getTime()) {
    throw new Error("퇴근일시는 출근일시 이후여야 합니다.");
  }
  return saveAttendance(supabase, {
    recordId: input.recordId,
    values: {
      ...(clockInAt ? { work_intime: clockInAt } : {}),
      ...(clockOutAt ? { work_outtime: clockOutAt } : {}),
    },
  });
}

export async function loadAttendanceRecord(
  recordId: string,
  supabase: SupabaseClient = getSupabase(),
): Promise<AttendanceRecord> {
  if (!recordId.trim()) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }

  const { data: attendance, error: attendanceError } = await supabase
    .from("work_record")
    .select("id,employee_id,worksite_id,work_date,intime,outtime,work_intime,work_outtime,intime_status,outtime_status")
    .eq("id", recordId)
    .single();

  throwIfError(attendanceError);
  if (!attendance) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("name,work_style")
    .eq("id", attendance.employee_id)
    .maybeSingle();

  throwIfError(employeeError);

  const worksiteResult = attendance.worksite_id
    ? await supabase.from("worksites").select("name").eq("id", attendance.worksite_id).maybeSingle()
    : { data: null, error: null };
  throwIfError(worksiteResult.error);

  const scheduledIn = toKstDateTime(attendance.intime);
  const scheduledOut = toKstDateTime(attendance.outtime);
  const derivedStatuses = deriveAttendanceStatuses({
    scheduledIn: attendance.intime,
    scheduledOut: attendance.outtime,
    workIn: attendance.work_intime,
    workOut: attendance.work_outtime,
  });
  const status = intimeStatusLabels[(attendance.intime_status ?? derivedStatuses.intime_status) as IntimeStatus];

  return {
    id: attendance.id,
    employeeId: attendance.employee_id,
    worksiteName: worksiteResult.data?.name ?? "-",
    workDate: attendance.work_date,
    workStyle: workStyleLabel(employee?.work_style),
    scheduledClockIn: scheduledIn?.time ?? "-",
    scheduledClockOut: scheduledOut?.time ?? "-",
    status: status ?? "결근",
    employeeName: employee?.name ?? "-",
    clockInDateTime: toKstDateTime(attendance.work_intime)?.dateTime ?? "-",
    clockOutDateTime: toKstDateTime(attendance.work_outtime)?.dateTime ?? null,
    intimeStatus: (attendance.intime_status ?? derivedStatuses.intime_status) as IntimeStatus,
    outtimeStatus: (attendance.outtime_status ?? derivedStatuses.outtime_status) as OuttimeStatus,
    outtimeLabel: (attendance.outtime_status ?? derivedStatuses.outtime_status) === "1" ? "조퇴" : (attendance.outtime_status ?? derivedStatuses.outtime_status) === "2" ? "퇴근" : "미퇴근",
  };
}

export async function deleteAttendanceRecord(recordId: string) {
  if (!recordId.trim()) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("work_record")
    .delete()
    .eq("id", recordId)
    .select("id")
    .maybeSingle();

  throwIfError(error);
  if (!data) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }
}

export function buildEducationReport(input: {
  year: string;
  employees: EmployeeInput[];
  resources: ResourceInput[];
  completions: CompletionInput[];
}): EducationReportRow[] {
  assertYear(input.year);
  const counts = new Map<string, { completedCount: number; totalCount: number }>();
  for (const completion of input.completions) {
    const date = completion.education_date ?? (completion.completed_at ? toKstDateTime(completion.completed_at)?.date : null);
    if (!date || date.slice(0, 4) !== input.year) continue;
    const count = counts.get(completion.employee_id) ?? { completedCount: 0, totalCount: 0 };
    count.totalCount++;
    if (completion.is_completed) count.completedCount++;
    counts.set(completion.employee_id, count);
  }
  return input.employees.filter((employee) => !employee.is_retired)
    .sort((a, b) => a.name.localeCompare(b.name, "ko-KR"))
    .map((employee) => ({ employeeName: employee.name, ...(counts.get(employee.id) ?? { completedCount: 0, totalCount: 0 }) }));
}

export async function loadAttendanceReport(input: { employeeName: string; workDate: string }) {
  if (input.workDate) assertDate(input.workDate);
  const supabase = getSupabaseAdmin();
  let workRecordQuery = supabase
    .from("work_record")
    .select("id,employee_id,worksite_id,work_date,intime,outtime,work_intime,work_outtime,intime_status,outtime_status");
  if (input.workDate) {
    const dayStart = new Date(`${input.workDate}T00:00:00+09:00`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    workRecordQuery = workRecordQuery.or(
      `work_date.eq.${input.workDate},and(outtime.gte.${dayStart.toISOString()},outtime.lt.${dayEnd.toISOString()})`,
    );
  }
  const [employeesResult, workRecordResult, worksitesResult, assignmentsResult] = await Promise.all([
    supabase.from("employees").select("id,name,role,work_style").ilike("name", `%${input.employeeName.trim()}%`),
    workRecordQuery.order("work_date", { ascending: true }),
    supabase.from("worksites").select("id,name"),
    supabase.from("work_assignments").select("id,employee_id,worksite_id"),
  ]);

  throwIfError(employeesResult.error);
  throwIfError(workRecordResult.error);
  throwIfError(worksitesResult.error);
  throwIfError(assignmentsResult.error);

  const workRecords = workRecordResult.data ?? [];

  return buildAttendanceReport({
    employeeName: input.employeeName,
    workDate: input.workDate,
    employees: employeesResult.data ?? [],
    attendance: workRecords,
    worksites: worksitesResult.data ?? [],
    assignments: assignmentsResult.data ?? [],
    dailyAttendance: workRecords,
    now: new Date(),
  });
}

export async function loadEducationReport(input: { year: string }) {
  assertYear(input.year);
  const supabase = getSupabaseAdmin();
  const [employeesResult, resourcesResult, completionsResult] = await Promise.all([
    supabase.from("employees").select("id,name,is_retired"),
    supabase.from("education_resources").select("id"),
    readAllEducationRows<CompletionInput>((from, to) => supabase.from("education_completions")
      .select("employee_id,resource_id,education_date,is_completed,completed_at")
      .gte("education_date", input.year + "-01-01").lte("education_date", input.year + "-12-31")
      .order("id").range(from, to)).then((data) => ({ data, error: null })),
  ]);

  throwIfError(employeesResult.error);
  throwIfError(resourcesResult.error);
  throwIfError(completionsResult.error);

  return buildEducationReport({
    year: input.year,
    employees: employeesResult.data ?? [],
    resources: resourcesResult.data ?? [],
    completions: completionsResult.data ?? [],
  });
}

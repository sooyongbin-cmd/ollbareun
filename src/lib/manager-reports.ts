import type { SupabaseClient } from "@supabase/supabase-js";
import { durationLabel } from "./work-duration";
import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";

type EmployeeInput = {
  id: string;
  name: string;
  work_style?: "0" | "1" | "2" | null;
  is_retired?: boolean;
};

type IntimeStatus = "0" | "1" | "2" | "3";
type AttendanceReportStatus = "결근" | "지각" | "정상출근" | "정상근무" | "대기";

const intimeStatusLabels: Record<IntimeStatus, Exclude<AttendanceReportStatus, "대기">> = {
  "0": "결근",
  "1": "지각",
  "2": "정상출근",
  "3": "정상근무",
};

type AttendanceInput = {
  id: string;
  worksite_id?: string | null;
  employee_id: string;
  work_date: string;
  intime?: string | null;
  outtime?: string | null;
  intime_status?: IntimeStatus | null;
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

type AttendanceStatusEmployeeInput = EmployeeInput & {
  role?: string | null;
};

type ResourceInput = {
  id: string;
};

type CompletionInput = {
  employee_id: string;
  resource_id: string;
  is_completed: boolean;
  completed_at: string | null;
};

export type AttendanceReportRow = {
  id: string;
  worksiteName: string;
  employeeName: string;
  workStyle: string;
  scheduledClockIn: string;
  scheduledClockOut: string;
  clockInDateTime: string;
  clockOutDateTime: string | null;
  workDuration: string;
  intimeStatus: IntimeStatus;
  status: AttendanceReportStatus;
  isLate: boolean;
};

export type AttendanceStatusRow = {
  id: string;
  employeeName: string;
  workStyle: string;
  worksiteName: string;
  scheduledClockIn: string;
  scheduledClockOut: string;
  clockInDateTime: string | null;
  clockOutDateTime: string | null;
  workDuration: string;
  status: "출근" | "지각" | "대기" | "결근";
};

export type AttendanceRecord = {
  id: string;
  worksiteName: string;
  clockInLatitude: number | null;
  clockInLongitude: number | null;
  clockOutLatitude: number | null;
  clockOutLongitude: number | null;
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
    .filter((record) => record.work_date === input.workDate && employeeIds.has(record.employee_id))
    .sort((left, right) => left.work_date.localeCompare(right.work_date))
    .map((record) => {
      const scheduledTime = scheduledTimes.get(
        `${record.employee_id}:${record.worksite_id ?? ""}:${record.work_date}`,
      );
      const intimeStatus = record.intime_status ?? "0";
      const scheduledClockInAt = scheduledTime?.intime ?? record.intime ?? null;
      const scheduledClockInTimestamp = scheduledClockInAt ? new Date(scheduledClockInAt).getTime() : Number.NaN;
      const status: AttendanceReportStatus = intimeStatus === "0"
        && Number.isFinite(scheduledClockInTimestamp)
        && scheduledClockInTimestamp > nowTimestamp
        ? "대기"
        : intimeStatusLabels[intimeStatus];

      return {
        id: record.id,
        worksiteName: worksiteNamesById.get(record.worksite_id ?? "") ?? "-",
        employeeName: employeeNamesById.get(record.employee_id) ?? "-",
        workStyle: workStylesByEmployeeId.get(record.employee_id) ?? "-",
        scheduledClockIn: toKstDateTime(scheduledClockInAt)?.time ?? "-",
        scheduledClockOut: toKstDateTime(scheduledTime?.outtime ?? record.outtime ?? null)?.time ?? "-",
        clockInDateTime: toKstDateTime(record.work_intime)?.dateTime ?? "-",
        clockOutDateTime: toKstDateTime(record.work_outtime)?.dateTime ?? null,
        workDuration: durationLabel(record.work_intime, record.work_outtime),
        intimeStatus,
        status,
        isLate: intimeStatus === "1",
      };
    });
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

export function buildAttendanceStatus(input: {
  date: string;
  now?: Date;
  employees: AttendanceStatusEmployeeInput[];
  assignments: AssignmentInput[];
  worksites: { id: string; name: string }[];
  dailyAttendance: DailyAttendanceInput[];
  attendance: AttendanceInput[];
}): AttendanceStatusRow[] {
  assertDate(input.date);
  const nowTimestamp = (input.now ?? new Date()).getTime();

  const employeesById = new Map(input.employees.map((employee) => [employee.id, employee]));
  const worksitesById = new Map(input.worksites.map((worksite) => [worksite.id, worksite.name]));
  const attendanceByEmployeeAndWorksite = new Map(
    input.attendance.map((record) => [`${record.employee_id}:${record.worksite_id ?? ""}`, record]),
  );
  const attendanceByEmployee = new Map(input.attendance.map((record) => [record.employee_id, record]));

  return input.dailyAttendance
    .filter((dailyAttendance) => dailyAttendance.work_date === input.date && dailyAttendance.intime)
    .flatMap((dailyAttendance) => {
      const employee = employeesById.get(dailyAttendance.employee_id);
      if (!employee || employee.is_retired) {
        return [];
      }

      const attendance =
        attendanceByEmployeeAndWorksite.get(`${dailyAttendance.employee_id}:${dailyAttendance.worksite_id}`)
        ?? attendanceByEmployee.get(dailyAttendance.employee_id);
      const clockIn = attendance?.work_intime ? toKstDateTime(attendance.work_intime) : null;
      const scheduledTimestamp = new Date(dailyAttendance.intime as string).getTime();
      const clockInTimestamp = attendance?.work_intime ? new Date(attendance.work_intime).getTime() : Number.NaN;
      const status: AttendanceStatusRow["status"] = !Number.isFinite(clockInTimestamp)
        ? Number.isFinite(scheduledTimestamp) && scheduledTimestamp >= nowTimestamp ? "대기" : "결근"
        : Number.isFinite(scheduledTimestamp) && clockInTimestamp > scheduledTimestamp
          ? "지각"
          : "출근";

      return [{
        id: dailyAttendance.id ?? `${dailyAttendance.employee_id}:${dailyAttendance.work_date}`,
        employeeName: employee.name,
        workStyle: workStyleLabel(employee.work_style),
        worksiteName: worksitesById.get(dailyAttendance.worksite_id) ?? "-",
        scheduledClockIn: toKstDateTime(dailyAttendance.intime)?.time ?? "-",
        scheduledClockOut: toKstDateTime(dailyAttendance.outtime ?? null)?.time ?? "-",
        clockInDateTime: clockIn?.dateTime ?? null,
        clockOutDateTime: toKstDateTime(attendance?.work_outtime ?? null)?.dateTime ?? null,
        workDuration: durationLabel(attendance?.work_intime ?? null, attendance?.work_outtime ?? null),
        status,
      }];
    })
    .sort((left, right) => {
      const leftScheduled = left.scheduledClockIn === "-" ? "99:99" : left.scheduledClockIn;
      const rightScheduled = right.scheduledClockIn === "-" ? "99:99" : right.scheduledClockIn;
      return leftScheduled.localeCompare(rightScheduled) || left.employeeName.localeCompare(right.employeeName, "ko-KR");
    });
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

function getAttendanceStatuses(input: {
  scheduledIn: string | null | undefined;
  scheduledOut: string | null | undefined;
  workIn: string;
  workOut: string | null;
}) {
  const isLate = Boolean(input.scheduledIn && new Date(input.workIn).getTime() > new Date(input.scheduledIn).getTime());
  const isEarlyDeparture = Boolean(
    input.workOut && input.scheduledOut && new Date(input.workOut).getTime() < new Date(input.scheduledOut).getTime(),
  );

  return {
    intime_status: input.workOut && !isEarlyDeparture ? "3" : isLate ? "1" : "2",
    outtime_status: isEarlyDeparture ? "4" : null,
  } as const;
}

export async function updateAttendanceRecord(input: {
  recordId: unknown;
  clockInDateTime: unknown;
  clockOutDateTime: unknown;
}) {
  if (typeof input.recordId !== "string" || !input.recordId.trim()) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }

  const clockInAt = kstDateTimeLocalToIso(input.clockInDateTime, "출근일시");
  const clockOutAt =
    input.clockOutDateTime === null || input.clockOutDateTime === undefined || input.clockOutDateTime === ""
      ? null
      : kstDateTimeLocalToIso(input.clockOutDateTime, "퇴근일시");
  if (clockOutAt && new Date(clockOutAt).getTime() < new Date(clockInAt).getTime()) {
    throw new Error("퇴근일시는 출근일시 이후여야 합니다.");
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("work_record")
    .select("id,intime,outtime,work_intime,work_outtime")
    .eq("id", input.recordId)
    .single();
  throwIfError(existingError);
  if (!existing) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }

  const nextWorkOuttime = input.clockOutDateTime !== undefined ? clockOutAt : existing.work_outtime;
  const statuses = getAttendanceStatuses({
    scheduledIn: existing.intime,
    scheduledOut: existing.outtime,
    workIn: clockInAt,
    workOut: nextWorkOuttime,
  });
  const { data, error } = await supabase
    .from("work_record")
    .update({
      work_date: String(input.clockInDateTime).slice(0, 10),
      work_intime: clockInAt,
      ...(input.clockOutDateTime !== undefined ? { work_outtime: clockOutAt } : {}),
      ...statuses,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.recordId)
    .select("id,work_date,work_intime,work_outtime")
    .single();

  throwIfError(error);
  return data;
}

export async function createAttendanceRecord(input: {
  employeeId: unknown;
  worksiteId: unknown;
  clockInDateTime: unknown;
  clockOutDateTime: unknown;
}) {
  if (typeof input.employeeId !== "string" || !input.employeeId.trim()) throw new Error("직원을 선택하세요.");
  if (typeof input.worksiteId !== "string" || !input.worksiteId.trim()) throw new Error("근무지를 선택하세요.");
  const clockInAt = kstDateTimeLocalToIso(input.clockInDateTime, "출근일시");
  const clockOutAt = input.clockOutDateTime === "" || input.clockOutDateTime == null
    ? null : kstDateTimeLocalToIso(input.clockOutDateTime, "퇴근일시");
  if (clockOutAt && new Date(clockOutAt).getTime() < new Date(clockInAt).getTime()) {
    throw new Error("퇴근일시는 출근일시 이후여야 합니다.");
  }
  const supabase = getSupabaseAdmin();
  const workDate = String(input.clockInDateTime).slice(0, 10);
  const { data: existing, error: existingError } = await supabase
    .from("work_record")
    .select("id,intime,outtime,work_intime")
    .eq("employee_id", input.employeeId)
    .eq("work_date", workDate)
    .maybeSingle();
  throwIfError(existingError);
  if (existing?.work_intime) {
    throw new Error("해당 직원의 같은 날짜 출근 기록이 이미 있습니다.");
  }

  const statuses = getAttendanceStatuses({
    scheduledIn: existing?.intime,
    scheduledOut: existing?.outtime,
    workIn: clockInAt,
    workOut: clockOutAt,
  });
  const recordValues = {
    employee_id: input.employeeId,
    worksite_id: input.worksiteId,
    work_date: workDate,
    work_intime: clockInAt,
    work_outtime: clockOutAt,
    ...statuses,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = existing
    ? await supabase.from("work_record").update(recordValues).eq("id", existing.id).select("id").single()
    : await supabase.from("work_record").insert(recordValues).select("id").single();
  if (error?.code === "23505") throw new Error("해당 직원의 같은 날짜 출근 기록이 이미 있습니다.");
  throwIfError(error);
  return data;
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
    .select("id,employee_id,worksite_id,work_intime,work_outtime,clock_in_latitude,clock_in_longitude,clock_out_latitude,clock_out_longitude")
    .eq("id", recordId)
    .single();

  throwIfError(attendanceError);
  if (!attendance) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("name")
    .eq("id", attendance.employee_id)
    .maybeSingle();

  throwIfError(employeeError);

  const worksiteResult = attendance.worksite_id
    ? await supabase.from("worksites").select("name").eq("id", attendance.worksite_id).maybeSingle()
    : { data: null, error: null };
  throwIfError(worksiteResult.error);

  return {
    id: attendance.id,
    worksiteName: worksiteResult.data?.name ?? "-",
    clockInLatitude: attendance.clock_in_latitude ?? null,
    clockInLongitude: attendance.clock_in_longitude ?? null,
    clockOutLatitude: attendance.clock_out_latitude ?? null,
    clockOutLongitude: attendance.clock_out_longitude ?? null,
    employeeName: employee?.name ?? "-",
    clockInDateTime: toKstDateTime(attendance.work_intime)?.dateTime ?? "-",
    clockOutDateTime: toKstDateTime(attendance.work_outtime)?.dateTime ?? null,
  };
}

export async function deleteAttendanceRecord(recordId: string) {
  if (!recordId.trim()) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("work_record").delete().eq("id", recordId);

  throwIfError(error);
}

export function buildEducationReport(input: {
  year: string;
  employees: EmployeeInput[];
  resources: ResourceInput[];
  completions: CompletionInput[];
}): EducationReportRow[] {
  assertYear(input.year);
  const completionsByEmployee = new Map<string, Set<string>>();

  input.completions.forEach((completion) => {
    if (!completion.is_completed || !completion.completed_at) {
      return;
    }
    const completedYear = toKstDateTime(completion.completed_at)?.date.slice(0, 4);
    if (completedYear !== input.year) {
      return;
    }
    const completed = completionsByEmployee.get(completion.employee_id) ?? new Set<string>();
    completed.add(completion.resource_id);
    completionsByEmployee.set(completion.employee_id, completed);
  });

  return input.employees
    .filter((employee) => !employee.is_retired)
    .sort((left, right) => left.name.localeCompare(right.name, "ko-KR"))
    .map((employee) => ({
      employeeName: employee.name,
      completedCount: completionsByEmployee.get(employee.id)?.size ?? 0,
      totalCount: input.resources.length,
    }));
}

export async function loadAttendanceReport(input: { employeeName: string; workDate: string }) {
  assertDate(input.workDate);
  const supabase = getSupabaseAdmin();
  const [employeesResult, workRecordResult, worksitesResult, assignmentsResult] = await Promise.all([
    supabase.from("employees").select("id,name,work_style").ilike("name", `%${input.employeeName.trim()}%`),
    supabase
      .from("work_record")
      .select("id,employee_id,worksite_id,work_date,intime,outtime,work_intime,work_outtime,intime_status")
      .eq("work_date", input.workDate)
      .order("work_date", { ascending: true }),
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

export async function loadAttendanceStatus(input: { date: string }) {
  assertDate(input.date);
  const supabase = getSupabaseAdmin();
  const [workRecordResult, assignmentsResult, employeesResult, worksitesResult] = await Promise.all([
    supabase
      .from("work_record")
      .select("id,employee_id,worksite_id,work_date,intime,outtime,work_intime,work_outtime")
      .eq("work_date", input.date),
    supabase.from("work_assignments").select("id,employee_id,worksite_id"),
    supabase.from("employees").select("id,name,role,work_style,is_retired"),
    supabase.from("worksites").select("id,name"),
  ]);

  throwIfError(workRecordResult.error);
  throwIfError(assignmentsResult.error);
  throwIfError(employeesResult.error);
  throwIfError(worksitesResult.error);
  const workRecords = workRecordResult.data ?? [];

  return buildAttendanceStatus({
    date: input.date,
    now: new Date(),
    employees: employeesResult.data ?? [],
    assignments: assignmentsResult.data ?? [],
    worksites: worksitesResult.data ?? [],
    dailyAttendance: workRecords,
    attendance: workRecords,
  });
}

export async function loadEducationReport(input: { year: string }) {
  assertYear(input.year);
  const supabase = getSupabase();
  const [employeesResult, resourcesResult, completionsResult] = await Promise.all([
    supabase.from("employees").select("id,name,is_retired"),
    supabase.from("education_resources").select("id"),
    supabase.from("education_completions").select("employee_id,resource_id,is_completed,completed_at"),
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

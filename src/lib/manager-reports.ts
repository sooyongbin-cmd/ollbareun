import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";

type EmployeeInput = {
  id: string;
  name: string;
  is_retired?: boolean;
};

type AttendanceInput = {
  id: string;
  employee_id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
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
  employeeName: string;
  clockInDateTime: string;
  clockOutDateTime: string | null;
  workDuration: string;
};

export type AttendanceRecord = {
  id: string;
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

function durationLabel(clockInAt: string | null, clockOutAt: string | null) {
  const clockIn = toKstDateTime(clockInAt);
  const clockOut = toKstDateTime(clockOutAt);
  if (!clockIn || !clockOut || clockOut.timestamp < clockIn.timestamp) {
    return "-";
  }

  const totalMinutes = Math.round((clockOut.timestamp - clockIn.timestamp) / 60000);
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

function assertYear(year: string) {
  if (!/^\d{4}$/.test(year)) {
    throw new Error("연도는 4자리 숫자로 입력하세요.");
  }
}

export function buildAttendanceReport(input: {
  employeeName: string;
  year: string;
  employees: EmployeeInput[];
  attendance: AttendanceInput[];
}): AttendanceReportRow[] {
  assertYear(input.year);
  const query = input.employeeName.trim().toLowerCase();
  const employeeIds = new Set(
    input.employees
      .filter((employee) => employee.name.toLowerCase().includes(query))
      .map((employee) => employee.id),
  );
  const employeeNamesById = new Map(input.employees.map((employee) => [employee.id, employee.name]));

  return input.attendance
    .filter((record) => record.work_date.startsWith(`${input.year}-`) && employeeIds.has(record.employee_id))
    .sort((left, right) => left.work_date.localeCompare(right.work_date))
    .map((record) => ({
      id: record.id,
      employeeName: employeeNamesById.get(record.employee_id) ?? "-",
      clockInDateTime: toKstDateTime(record.clock_in_at)?.dateTime ?? "-",
      clockOutDateTime: toKstDateTime(record.clock_out_at)?.dateTime ?? null,
      workDuration: durationLabel(record.clock_in_at, record.clock_out_at),
    }));
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
  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      work_date: String(input.clockInDateTime).slice(0, 10),
      clock_in_at: clockInAt,
      clock_out_at: clockOutAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.recordId)
    .select("id,work_date,clock_in_at,clock_out_at")
    .single();

  throwIfError(error);
  return data;
}

export async function loadAttendanceRecord(recordId: string): Promise<AttendanceRecord> {
  if (!recordId.trim()) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }

  const supabase = getSupabase();
  const { data: attendance, error: attendanceError } = await supabase
    .from("attendance_records")
    .select("id,employee_id,clock_in_at,clock_out_at")
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

  return {
    id: attendance.id,
    employeeName: employee?.name ?? "-",
    clockInDateTime: toKstDateTime(attendance.clock_in_at)?.dateTime ?? "-",
    clockOutDateTime: toKstDateTime(attendance.clock_out_at)?.dateTime ?? null,
  };
}

export async function deleteAttendanceRecord(recordId: string) {
  if (!recordId.trim()) {
    throw new Error("근태 기록을 확인할 수 없습니다.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("attendance_records").delete().eq("id", recordId);

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

export async function loadAttendanceReport(input: { employeeName: string; year: string }) {
  assertYear(input.year);
  const supabase = getSupabase();
  const [employeesResult, attendanceResult] = await Promise.all([
    supabase.from("employees").select("id,name").ilike("name", `%${input.employeeName.trim()}%`),
    supabase
      .from("attendance_records")
      .select("id,employee_id,work_date,clock_in_at,clock_out_at")
      .gte("work_date", `${input.year}-01-01`)
      .lte("work_date", `${input.year}-12-31`)
      .order("work_date", { ascending: true }),
  ]);

  throwIfError(employeesResult.error);
  throwIfError(attendanceResult.error);

  return buildAttendanceReport({
    employeeName: input.employeeName,
    year: input.year,
    employees: employeesResult.data ?? [],
    attendance: attendanceResult.data ?? [],
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

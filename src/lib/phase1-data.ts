import { canClockIn, canClockOut, canClockOutAtWorksite, normalizePhone } from "./phase1";
import { requireGpsInfo, type GpsInfo } from "./gps";
import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";
import { getAssignmentDayOffCounts, isAssignmentDayOff } from "./assignment-days-off";

export type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
  is_retired: boolean;
  role: "경비원" | "미화원" | "파견";
  created_at: string;
};

export type WorksiteRow = {
  id: string;
  name: string;
  address: string;
  gps_info: GpsInfo;
  radius_meters: number;
  created_at: string;
};

export type AssignmentRow = {
  id: string;
  employee_id: string;
  worksite_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

export type AssignmentListRow = AssignmentRow & {
  employee_name: string;
  worksite_name: string;
  days_off_count: number;
};

export type AttendanceRow = {
  id: string;
  employee_id: string;
  worksite_id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_at: string | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  created_at: string;
  updated_at: string;
};

export function todayDate() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label}을 입력하세요.`);
  }

  return value.trim();
}

function requireNumber(value: unknown, label: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} 값이 올바르지 않습니다.`);
  }

  return number;
}

function requireDate(value: unknown, label: string) {
  const date = requireString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${label} 값이 올바르지 않습니다.`);
  }

  return date;
}

function requireDateRange(input: { startDate?: unknown; endDate?: unknown }) {
  const start_date =
    typeof input.startDate === "string" && input.startDate ? requireDate(input.startDate, "시작일") : todayDate();
  const end_date =
    typeof input.endDate === "string" && input.endDate ? requireDate(input.endDate, "종료일") : start_date;

  if (start_date > end_date) {
    throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
  }

  return { start_date, end_date };
}

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function throwAssignmentOverlapError() {
  throw new Error("이미 겹치는 근무기간 배정이 있습니다.");
}

function throwIfAssignmentWriteError(error: { message: string; code?: string } | null) {
  if (error?.code === "23P01") {
    throwAssignmentOverlapError();
  }

  throwIfError(error);
}

export async function loadBootstrap() {
  const supabase = getSupabase();
  const [employeesResult, worksitesResult, assignmentsResult, attendanceResult] =
    await Promise.all([
      supabase.from("employees").select("*").order("created_at", { ascending: false }),
      supabase.from("worksites").select("*").order("created_at", { ascending: false }),
      supabase
        .from("work_assignments")
        .select("*")
        .lte("start_date", todayDate())
        .gte("end_date", todayDate())
        .order("created_at", { ascending: false }),
      supabase
        .from("attendance_records")
        .select("*")
        .eq("work_date", todayDate())
        .order("created_at", { ascending: false }),
    ]);

  throwIfError(employeesResult.error);
  throwIfError(worksitesResult.error);
  throwIfError(assignmentsResult.error);
  throwIfError(attendanceResult.error);

  const employees = employeesResult.data ?? [];
  const attendance = attendanceResult.data ?? [];

  return {
    employees,
    worksites: worksitesResult.data ?? [],
    assignments: assignmentsResult.data ?? [],
    attendance,
    summary: {
      totalEmployees: employees.length,
      currentlyClockedIn: attendance.filter(
        (record) => record.clock_in_at && !record.clock_out_at,
      ).length,
    },
  };
}

function validateEmployeeSchedule(input: { work_style?: unknown; in_time?: unknown; out_time?: unknown }) {
  const schedule: { work_style?: string; in_time?: string; out_time?: string } = {};
  if (input.work_style !== undefined) {
    if (input.work_style !== "0" && input.work_style !== "1" && input.work_style !== "2") throw new Error("올바르지 않은 근무형태입니다.");
    schedule.work_style = input.work_style;
  }
  for (const key of ["in_time", "out_time"] as const) {
    const value = input[key];
    if (value !== undefined) {
      if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) {
        throw new Error(key === "in_time" ? "출근시간을 올바르게 입력하세요." : "퇴근시간을 올바르게 입력하세요.");
      }
      schedule[key] = value;
    }
  }
  return schedule;
}

export async function createEmployee(input: { name: unknown; phone: unknown; role?: unknown; work_style?: unknown; in_time?: unknown; out_time?: unknown }) {
  const name = requireString(input.name, "직원이름");
  const phone = requireString(input.phone, "연락처");
  const phone_normalized = normalizePhone(phone);
  const role = input.role ? requireString(input.role, "역할") : "경비원";
  if (!["경비원", "미화원", "파견"].includes(role)) {
    throw new Error("올바르지 않은 역할입니다.");
  }

  const schedule = validateEmployeeSchedule(input);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("employees")
    .upsert(
      { name, phone, phone_normalized, is_retired: false, role, ...schedule },
      { onConflict: "name,phone_normalized" },
    )
    .select("*")
    .single();

  throwIfError(error);
  return data as EmployeeRow;
}

export async function getEmployeeById(id: unknown) {
  const employeeId = requireString(id, "직원");
  const supabase = getSupabase();
  const { data, error } = await supabase.from("employees").select("*").eq("id", employeeId).single();

  throwIfError(error);
  return data as EmployeeRow;
}

export async function updateEmployee(input: {
  id: unknown;
  name: unknown;
  phone: unknown;
  is_retired: unknown;
  role?: unknown;
  work_style?: unknown;
  in_time?: unknown;
  out_time?: unknown;
}) {
  const id = requireString(input.id, "직원");
  const name = requireString(input.name, "직원이름");
  const phone = requireString(input.phone, "연락처");
  const phone_normalized = normalizePhone(phone);
  const is_retired =
    input.is_retired === true || input.is_retired === "true" || input.is_retired === 1;
  const role = input.role ? requireString(input.role, "역할") : "경비원";
  if (!["경비원", "미화원", "파견"].includes(role)) {
    throw new Error("올바르지 않은 역할입니다.");
  }

  const schedule = validateEmployeeSchedule(input);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("employees")
    .update({ name, phone, phone_normalized, is_retired, role, ...schedule })
    .eq("id", id)
    .select("*")
    .single();

  throwIfError(error);
  return data as EmployeeRow;
}

export async function deleteEmployee(id: unknown) {
  const employeeId = requireString(id, "직원");
  const supabase = getSupabase();
  const { error } = await supabase.from("employees").delete().eq("id", employeeId);

  throwIfError(error);
}

export async function createWorksite(input: {
  name: unknown;
  address: unknown;
  gpsInfo: unknown;
  radiusMeters: unknown;
}) {
  const name = requireString(input.name, "근무지명");
  const address = requireString(input.address, "근무지주소");
  const gps_info = requireGpsInfo(input.gpsInfo);
  const radius_meters = Math.max(1, Math.round(requireNumber(input.radiusMeters, "반경")));

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("worksites")
    .insert({ name, address, gps_info, radius_meters })
    .select("*")
    .single();

  throwIfError(error);
  return data as WorksiteRow;
}

export async function getWorksiteById(id: unknown) {
  const worksiteId = requireString(id, "근무지");
  const supabase = getSupabase();
  const { data, error } = await supabase.from("worksites").select("*").eq("id", worksiteId).single();

  throwIfError(error);
  return data as WorksiteRow;
}

export async function updateWorksite(input: {
  id: unknown;
  name: unknown;
  address: unknown;
  gpsInfo: unknown;
  radiusMeters: unknown;
}) {
  const id = requireString(input.id, "근무지");
  const name = requireString(input.name, "근무지명");
  const address = requireString(input.address, "근무지주소");
  const gps_info = requireGpsInfo(input.gpsInfo);
  const radius_meters = Math.max(1, Math.round(requireNumber(input.radiusMeters, "허용반경")));

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("worksites")
    .update({ name, address, gps_info, radius_meters })
    .eq("id", id)
    .select("*")
    .single();

  throwIfError(error);
  return data as WorksiteRow;
}

export async function deleteWorksite(id: unknown) {
  const worksiteId = requireString(id, "근무지");
  const supabase = getSupabase();
  const { error } = await supabase.from("worksites").delete().eq("id", worksiteId);

  throwIfError(error);
}

export async function createAssignment(input: {
  employeeId: unknown;
  worksiteId: unknown;
  startDate?: unknown;
  endDate?: unknown;
  in_time?: unknown;
  out_time?: unknown;
}) {
  const employee_id = requireString(input.employeeId, "직원");
  const worksite_id = requireString(input.worksiteId, "근무지");
  const { start_date, end_date } = requireDateRange(input);

  const schedule = validateEmployeeSchedule({ in_time: input.in_time, out_time: input.out_time });
  const { data, error } = await getSupabaseAdmin().rpc("create_assignment_with_daily_attendance", {
    p_employee_id: employee_id,
    p_worksite_id: worksite_id,
    p_start_date: start_date,
    p_end_date: end_date,
    p_in_time: schedule.in_time ?? null,
    p_out_time: schedule.out_time ?? null,
  }).single();

  throwIfAssignmentWriteError(error);
  return data as AssignmentRow;
}

export async function listAssignments() {
  const supabase = getSupabase();
  const [assignmentsResult, employeesResult, worksitesResult, daysOffCountByAssignmentId] = await Promise.all([
    supabase.from("work_assignments").select("*").order("start_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("employees").select("id,name"),
    supabase.from("worksites").select("id,name"),
    getAssignmentDayOffCounts(),
  ]);

  throwIfError(assignmentsResult.error);
  throwIfError(employeesResult.error);
  throwIfError(worksitesResult.error);

  const employeesById = new Map((employeesResult.data ?? []).map((employee) => [employee.id, employee.name]));
  const worksitesById = new Map((worksitesResult.data ?? []).map((worksite) => [worksite.id, worksite.name]));

  return (assignmentsResult.data ?? []).map((assignment) => ({
    ...assignment,
    employee_name: employeesById.get(assignment.employee_id) ?? "직원 없음",
    worksite_name: worksitesById.get(assignment.worksite_id) ?? "근무지 없음",
    days_off_count: daysOffCountByAssignmentId.get(assignment.id) ?? 0,
  })) as AssignmentListRow[];
}

export async function getAssignmentById(id: unknown) {
  const assignmentId = requireString(id, "배정");
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("work_assignments")
    .select("*")
    .eq("id", assignmentId)
    .single();

  throwIfError(error);
  return data as AssignmentRow;
}

export async function updateAssignment(input: {
  id: unknown;
  employeeId: unknown;
  worksiteId: unknown;
  startDate?: unknown;
  endDate?: unknown;
}) {
  const id = requireString(input.id, "배정");
  const employee_id = requireString(input.employeeId, "직원");
  const worksite_id = requireString(input.worksiteId, "근무지");
  const { start_date, end_date } = requireDateRange(input);

  const supabase = getSupabase();
  const { data: overlappingAssignment, error: overlapError } = await supabase
    .from("work_assignments")
    .select("id")
    .eq("employee_id", employee_id)
    .neq("id", id)
    .lte("start_date", end_date)
    .gte("end_date", start_date)
    .limit(1)
    .maybeSingle();

  throwIfError(overlapError);
  if (overlappingAssignment) {
    throwAssignmentOverlapError();
  }

  const { data, error } = await supabase
    .from("work_assignments")
    .update({ employee_id, worksite_id, start_date, end_date })
    .eq("id", id)
    .select("*")
    .single();

  throwIfAssignmentWriteError(error);
  return data as AssignmentRow;
}

export async function deleteAssignment(id: unknown) {
  const assignmentId = requireString(id, "배정");
  const supabase = getSupabase();
  const { error } = await supabase.from("work_assignments").delete().eq("id", assignmentId);

  throwIfError(error);
}

export async function authenticateGuard(input: { name: unknown; phone: unknown }) {
  const name = requireString(input.name, "이름");
  const phone = requireString(input.phone, "연락처");
  const supabase = getSupabase();

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("name", name)
    .eq("phone_normalized", normalizePhone(phone))
    .maybeSingle();

  throwIfError(employeeError);
  if (!employee) {
    throw new Error("등록된 직원 정보와 일치하지 않습니다.");
  }

  if (employee.is_retired) {
    throw new Error("해당직원은 퇴직처리되었습니다.");
  }

  return loadGuardSessionByEmployee(employee as EmployeeRow);
}

async function loadGuardSessionByEmployee(employee: EmployeeRow) {
  const supabase = getSupabase();
  const { data: assignment, error: assignmentError } = await supabase
    .from("work_assignments")
    .select("*")
    .eq("employee_id", employee.id)
    .lte("start_date", todayDate())
    .gte("end_date", todayDate())
    .maybeSingle();

  throwIfError(assignmentError);
  const isDayOff = assignment ? await isAssignmentDayOff(assignment.id, todayDate()) : false;

  const [worksiteResult, attendance] = await Promise.all([
    assignment
      ? supabase.from("worksites").select("*").eq("id", assignment.worksite_id).single()
      : Promise.resolve({ data: null, error: null }),
    findGuardSessionAttendance(supabase, employee.id),
  ]);

  throwIfError(worksiteResult.error);

  return {
    employee: employee as EmployeeRow,
    assignment: assignment as AssignmentRow | null,
    worksite: worksiteResult.data as WorksiteRow | null,
    attendance,
    isDayOff,
  };
}

async function findLatestOpenAttendance(supabase: ReturnType<typeof getSupabase>, employeeId: string) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employeeId)
    .is("clock_out_at", null)
    .order("clock_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error);
  return data as AttendanceRow | null;
}

async function findTodayAttendance(supabase: ReturnType<typeof getSupabase>, employeeId: string) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("work_date", todayDate())
    .maybeSingle();

  throwIfError(error);
  return data as AttendanceRow | null;
}

async function findGuardSessionAttendance(supabase: ReturnType<typeof getSupabase>, employeeId: string) {
  return (await findLatestOpenAttendance(supabase, employeeId)) ?? (await findTodayAttendance(supabase, employeeId));
}

export async function loadGuardSessionByEmployeeId(employeeIdInput: unknown) {
  const employeeId = requireString(employeeIdInput, "경비원");
  const supabase = getSupabase();
  const { data: employee, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .maybeSingle();

  throwIfError(error);
  if (!employee) {
    throw new Error("등록된 직원 정보를 찾을 수 없습니다.");
  }

  if (employee.is_retired) {
    throw new Error("해당직원은 퇴직처리되었습니다.");
  }

  return loadGuardSessionByEmployee(employee as EmployeeRow);
}

export async function clockIn(input: {
  employeeId: unknown;
  worksiteId: unknown;
  latitude: unknown;
  longitude: unknown;
}) {
  const employee_id = requireString(input.employeeId, "직원");
  const worksite_id = requireString(input.worksiteId, "근무지");
  const latitude = requireNumber(input.latitude, "위도");
  const longitude = requireNumber(input.longitude, "경도");
  const supabase = getSupabase();

  const { data: assignment, error: assignmentError } = await supabase
    .from("work_assignments")
    .select("*")
    .eq("employee_id", employee_id)
    .eq("worksite_id", worksite_id)
    .lte("start_date", todayDate())
    .gte("end_date", todayDate())
    .maybeSingle();

  throwIfError(assignmentError);
  if (!assignment) {
    throw new Error("오늘 배정된 근무지가 없습니다.");
  }
  if (await isAssignmentDayOff(assignment.id, todayDate())) {
    throw new Error("오늘은 휴무일로 지정되어 출근할 수 없습니다.");
  }

  const { data: worksite, error: worksiteError } = await supabase
    .from("worksites")
    .select("*")
    .eq("id", worksite_id)
    .single();

  throwIfError(worksiteError);

  const decision = canClockIn({
    worksite: {
      id: worksite.id,
      name: worksite.name,
      latitude: worksite.gps_info.latitude,
      longitude: worksite.gps_info.longitude,
      radiusMeters: worksite.radius_meters,
    },
    currentLatitude: latitude,
    currentLongitude: longitude,
  });

  if (!decision.allowed) {
    throw new Error(decision.reason);
  }

  const { data, error } = await supabase
    .from("attendance_records")
    .upsert(
      {
        employee_id,
        worksite_id,
        work_date: todayDate(),
        clock_in_at: new Date().toISOString(),
        clock_in_latitude: latitude,
        clock_in_longitude: longitude,
        clock_out_at: null,
        clock_out_latitude: null,
        clock_out_longitude: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id,work_date" },
    )
    .select("*")
    .single();

  throwIfError(error);
  return data as AttendanceRow;
}

export async function clockOut(input: {
  employeeId: unknown;
  latitude: unknown;
  longitude: unknown;
}) {
  const employee_id = requireString(input.employeeId, "직원");
  const latitude = requireNumber(input.latitude, "위도");
  const longitude = requireNumber(input.longitude, "경도");
  const supabase = getSupabase();

  const attendance = await findLatestOpenAttendance(supabase, employee_id);

  const attendanceRecord = attendance?.clock_in_at
    ? {
        id: attendance.id,
        employeeId: attendance.employee_id,
        worksiteId: attendance.worksite_id,
        clockInAt: attendance.clock_in_at,
        clockOutAt: attendance.clock_out_at,
      }
    : null;
  const decision = canClockOut(attendanceRecord);

  if (!decision.allowed) {
    throw new Error(decision.reason);
  }

  if (!attendance) {
    throw new Error(decision.reason);
  }

  const { data: worksite, error: worksiteError } = await supabase
    .from("worksites")
    .select("*")
    .eq("id", attendance.worksite_id)
    .single();

  throwIfError(worksiteError);

  const locationDecision = canClockOutAtWorksite({
    attendance: attendanceRecord,
    worksite: {
      id: worksite.id,
      name: worksite.name,
      latitude: worksite.gps_info.latitude,
      longitude: worksite.gps_info.longitude,
      radiusMeters: worksite.radius_meters,
    },
    currentLatitude: latitude,
    currentLongitude: longitude,
  });

  if (!locationDecision.allowed) {
    throw new Error(locationDecision.reason);
  }

  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      clock_out_at: new Date().toISOString(),
      clock_out_latitude: latitude,
      clock_out_longitude: longitude,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attendance.id)
    .select("*")
    .single();

  throwIfError(error);
  return data as AttendanceRow;
}

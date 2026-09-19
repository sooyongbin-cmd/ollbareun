import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase-admin";

export type LeaveType = "1" | "2";

export type LeaveListRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  workStyle: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  worksiteName: string;
  assignmentStartDate: string | null;
  assignmentEndDate: string | null;
};

export type LeaveRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
};

export type LeaveScheduledWork = {
  workDate: string;
  intime: string | null;
  outtime: string | null;
};

export const leaveTypeLabels: Record<LeaveType, string> = {
  "1": "월차",
  "2": "연차",
};

function throwIfError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message ?? "휴가 자료를 처리하지 못했습니다.");
  }
}

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label}을(를) 입력하세요.`);
  }

  return value.trim();
}

function requireDate(value: unknown, label: string) {
  const date = requireString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${label}을(를) 올바르게 입력하세요.`);
  }

  const parsed = new Date(`${date}T00:00:00+09:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label}을(를) 올바르게 입력하세요.`);
  }

  const normalized = new Date(parsed.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (normalized !== date) {
    throw new Error(`${label}을(를) 올바르게 입력하세요.`);
  }

  return date;
}

function requireLeaveType(value: unknown) {
  if (value !== "1" && value !== "2") {
    throw new Error("휴가종류를 선택하세요.");
  }

  return value as LeaveType;
}

function workStyleLabel(workStyle: "0" | "1" | "2" | null | undefined) {
  return workStyle === "0" ? "일반근무" : workStyle === "1" ? "격일근무" : workStyle === "2" ? "야간근무" : "-";
}

function parseLeaveInput(input: {
  employeeId: unknown;
  leaveType: unknown;
  startDate: unknown;
  endDate: unknown;
}) {
  const employeeId = requireString(input.employeeId, "이름");
  const leaveType = requireLeaveType(input.leaveType);
  const startDate = requireDate(input.startDate, "시작일");
  const endDate = requireDate(input.endDate, "종료일");

  if (startDate > endDate) {
    throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
  }

  return { employeeId, leaveType, startDate, endDate };
}

function toLeaveListRow(
  row: { id: string; employee_id: string; leave_type: LeaveType; start_date: string; end_date: string },
  employeesById: Map<string, { name: string; role?: string | null; work_style?: "0" | "1" | "2" | null }>,
  worksitesById: Map<string, string>,
  assignments: { employee_id: string; worksite_id: string; start_date: string; end_date: string }[],
): LeaveListRow {
  const employee = employeesById.get(row.employee_id);
  const employeeAssignments = assignments
    .filter((candidate) => candidate.employee_id === row.employee_id)
    .sort((left, right) => right.start_date.localeCompare(left.start_date));
  const assignment = employeeAssignments.find(
    (candidate) => candidate.start_date <= row.end_date && row.start_date <= candidate.end_date,
  );

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: employee?.name ?? "-",
    employeeRole: employee?.role ?? "-",
    workStyle: workStyleLabel(employee?.work_style),
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    worksiteName: assignment ? worksitesById.get(assignment.worksite_id) ?? "-" : "-",
    assignmentStartDate: assignment?.start_date ?? null,
    assignmentEndDate: assignment?.end_date ?? null,
  };
}

function toLeaveRecord(
  row: { id: string; employee_id: string; leave_type: LeaveType; start_date: string; end_date: string },
  employeeName: string,
): LeaveRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

export async function listLeaves(
  input: { employeeName?: unknown } = {},
  supabase: SupabaseClient = getSupabaseAdmin(),
) {
  const employeeNameQuery = typeof input.employeeName === "string" ? input.employeeName.trim().toLowerCase() : "";
  const [leaveResult, employeesResult, assignmentsResult, worksitesResult] = await Promise.all([
    supabase
      .from("leave")
      .select("id,employee_id,leave_type,start_date,end_date")
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("employees").select("id,name,role,work_style"),
    supabase.from("work_assignments").select("employee_id,worksite_id,start_date,end_date"),
    supabase.from("worksites").select("id,name"),
  ]);

  throwIfError(leaveResult.error);
  throwIfError(employeesResult.error);
  throwIfError(assignmentsResult.error);
  throwIfError(worksitesResult.error);

  const employeesById = new Map((employeesResult.data ?? []).map((employee) => [employee.id, employee]));
  const worksitesById = new Map((worksitesResult.data ?? []).map((worksite) => [worksite.id, worksite.name]));
  return (leaveResult.data ?? [])
    .map((row) => toLeaveListRow(row, employeesById, worksitesById, assignmentsResult.data ?? []))
    .filter((row) => !employeeNameQuery || row.employeeName.toLowerCase().includes(employeeNameQuery));
}

export async function listLeaveScheduledWork(
  input: { employeeId: unknown; startDate: unknown; endDate: unknown },
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<LeaveScheduledWork[]> {
  const employeeId = requireString(input.employeeId, "직원");
  const startDate = requireDate(input.startDate, "시작일");
  const endDate = requireDate(input.endDate, "종료일");

  if (startDate > endDate) {
    throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("work_record")
    .select("work_date,intime,outtime")
    .eq("employee_id", employeeId)
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .order("work_date", { ascending: true });

  throwIfError(error);
  return (data ?? []).map((row) => ({
    workDate: row.work_date,
    intime: row.intime,
    outtime: row.outtime,
  }));
}

export async function getLeave(id: unknown, supabase: SupabaseClient = getSupabaseAdmin()): Promise<LeaveRecord> {
  const leaveId = requireString(id, "휴가");
  const { data: leave, error: leaveError } = await supabase
    .from("leave")
    .select("id,employee_id,leave_type,start_date,end_date")
    .eq("id", leaveId)
    .single();

  throwIfError(leaveError);
  if (!leave) {
    throw new Error("휴가 정보를 찾을 수 없습니다.");
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("name")
    .eq("id", leave.employee_id)
    .maybeSingle();
  throwIfError(employeeError);

  return toLeaveRecord(leave, employee?.name ?? "-");
}

export async function createLeave(
  input: { employeeId: unknown; leaveType: unknown; startDate: unknown; endDate: unknown },
  supabase: SupabaseClient = getSupabaseAdmin(),
) {
  const values = parseLeaveInput(input);
  const { data, error } = await supabase
    .from("leave")
    .insert({
      employee_id: values.employeeId,
      leave_type: values.leaveType,
      start_date: values.startDate,
      end_date: values.endDate,
      updated_at: new Date().toISOString(),
    })
    .select("id,employee_id,leave_type,start_date,end_date")
    .single();

  throwIfError(error);
  return data;
}

export async function updateLeave(
  input: { id: unknown; employeeId: unknown; leaveType: unknown; startDate: unknown; endDate: unknown },
  supabase: SupabaseClient = getSupabaseAdmin(),
) {
  const id = requireString(input.id, "휴가");
  const values = parseLeaveInput(input);
  const { data, error } = await supabase
    .from("leave")
    .update({
      employee_id: values.employeeId,
      leave_type: values.leaveType,
      start_date: values.startDate,
      end_date: values.endDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,employee_id,leave_type,start_date,end_date")
    .single();

  throwIfError(error);
  return data;
}

export async function deleteLeave(id: unknown, supabase: SupabaseClient = getSupabaseAdmin()) {
  const leaveId = requireString(id, "휴가");
  const { error } = await supabase.from("leave").delete().eq("id", leaveId);
  throwIfError(error);
}

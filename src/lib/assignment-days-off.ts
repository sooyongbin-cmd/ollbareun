import { getSupabaseAdmin } from "./supabase-admin";

export type AssignmentDayOffRow = {
  id: string;
  work_assignment_id: string;
  day_off_date: string;
  created_at: string;
};

type AssignmentPeriod = {
  id: string;
  start_date: string;
  end_date: string;
};

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} 정보가 올바르지 않습니다.`);
  }
  return value.trim();
}

export function requireDayOffDate(value: unknown) {
  const date = requireString(value, "휴무일");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("휴무일 형식이 올바르지 않습니다.");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error("휴무일 형식이 올바르지 않습니다.");
  }
  return date;
}

function throwIfError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message?.trim() || "휴무일 자료를 처리하지 못했습니다.");
  }
}

async function getAssignmentPeriod(assignmentIdInput: unknown): Promise<AssignmentPeriod> {
  const assignmentId = requireString(assignmentIdInput, "배정");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("work_assignments")
    .select("id,start_date,end_date")
    .eq("id", assignmentId)
    .maybeSingle();

  throwIfError(error);
  if (!data) {
    throw new Error("배정 정보를 찾을 수 없습니다.");
  }
  return data as AssignmentPeriod;
}

async function requireDateInAssignment(assignmentIdInput: unknown, dateInput: unknown) {
  const assignment = await getAssignmentPeriod(assignmentIdInput);
  const dayOffDate = requireDayOffDate(dateInput);
  if (dayOffDate < assignment.start_date || dayOffDate > assignment.end_date) {
    throw new Error("휴무일은 근무기간 안에서만 지정할 수 있습니다.");
  }
  return { assignment, dayOffDate };
}

export async function listAssignmentDaysOff(assignmentIdInput: unknown) {
  const assignment = await getAssignmentPeriod(assignmentIdInput);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("work_assignment_days_off")
    .select("*")
    .eq("work_assignment_id", assignment.id)
    .order("day_off_date", { ascending: true });

  throwIfError(error);
  return (data ?? []) as AssignmentDayOffRow[];
}

export async function addAssignmentDayOff(assignmentIdInput: unknown, dateInput: unknown) {
  const { assignment, dayOffDate } = await requireDateInAssignment(assignmentIdInput, dateInput);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("work_assignment_days_off")
    .upsert(
      { work_assignment_id: assignment.id, day_off_date: dayOffDate },
      { onConflict: "work_assignment_id,day_off_date", ignoreDuplicates: false },
    )
    .select("*")
    .single();

  throwIfError(error);
  return data as AssignmentDayOffRow;
}

export async function removeAssignmentDayOff(assignmentIdInput: unknown, dateInput: unknown) {
  const { assignment, dayOffDate } = await requireDateInAssignment(assignmentIdInput, dateInput);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("work_assignment_days_off")
    .delete()
    .eq("work_assignment_id", assignment.id)
    .eq("day_off_date", dayOffDate);

  throwIfError(error);
}

export async function isAssignmentDayOff(assignmentIdInput: unknown, dateInput: unknown) {
  const assignmentId = requireString(assignmentIdInput, "배정");
  const dayOffDate = requireDayOffDate(dateInput);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("work_assignment_days_off")
    .select("id")
    .eq("work_assignment_id", assignmentId)
    .eq("day_off_date", dayOffDate)
    .limit(1)
    .maybeSingle();

  throwIfError(error);
  return Boolean(data);
}

export async function listDaysOffByDate(dateInput: unknown) {
  const dayOffDate = requireDayOffDate(dateInput);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("work_assignment_days_off")
    .select("work_assignment_id,day_off_date")
    .eq("day_off_date", dayOffDate);

  throwIfError(error);
  return (data ?? []) as Pick<AssignmentDayOffRow, "work_assignment_id" | "day_off_date">[];
}

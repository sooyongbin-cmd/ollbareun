import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase-admin";
import { requireEducationType, type EducationType } from "./education-periods";

export type EducationCompletionRow = {
  id: string;
  employee_id: string;
  employee_name: string;
  resource_id: string;
  resource_title: string;
  resource_youtube_link: string;
  education_date: string | null;
  education_type: EducationType;
  is_completed: boolean;
  completed_at: string | null;
};
export type EducationDayRow = {
  employee_id: string;
  employee_name: string;
  education_date: string | null;
  items: Pick<EducationCompletionRow, "id" | "resource_id" | "resource_title" | "education_type" | "is_completed" | "completed_at">[];
};

function throwIfError(error: { message?: string } | null) {
  if (error) throw new Error(error.message || "교육이수 자료를 불러오지 못했습니다.");
}

/** Page through internal aggregates instead of silently stopping at PostgREST's row cap. */
export async function readAllEducationRows<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query(offset, offset + 499);
    throwIfError(error);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

export async function listEducationCompletions(supabase: SupabaseClient = getSupabaseAdmin()) {
  return readAllEducationRows<EducationCompletionRow>((from, to) =>
    supabase.rpc("current_completed_education").range(from, to));
}

export async function currentEducationStatus(employeeId: string, supabase = getSupabaseAdmin()) {
  return readAllEducationRows<EducationCompletionRow>((from, to) =>
    supabase.rpc("current_education_status", { p_employee_id: employeeId }).range(from, to));
}

export function parseEducationFilters(params: URLSearchParams) {
  const date = (name: string) => {
    const value = params.get(name)?.trim() || null;
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) {
      throw new Error("조회 날짜를 확인하세요.");
    }
    return value;
  };
  const from = date("from"), to = date("to");
  if (from && to && from > to) throw new Error("조회 종료일은 시작일 이후여야 합니다.");
  const page = Number(params.get("page") || 1);
  if (!Number.isSafeInteger(page) || page < 1) throw new Error("조회 페이지를 확인하세요.");
  return { from, to, page, pageSize: 50, name: params.get("name")?.trim() || "",
    type: params.get("educationType") ? requireEducationType(params.get("educationType")) : null,
    resourceId: params.get("resourceId") || null, employeeId: params.get("employeeId") || null };
}

export async function loadEducationHistory(params: URLSearchParams, supabase = getSupabaseAdmin()) {
  const f = parseEducationFilters(params);
  let query = supabase.from("education_completions")
    .select("id,employee_id,resource_id,education_date,education_type,is_completed,completed_at,employees!inner(name),education_resources!inner(title,youtube_link)", { count: "exact" });
  if (f.from) query = query.gte("education_date", f.from);
  if (f.to) query = query.lte("education_date", f.to);
  if (f.type) query = query.eq("education_type", f.type);
  if (f.resourceId) query = query.eq("resource_id", f.resourceId);
  if (f.employeeId) query = query.eq("employee_id", f.employeeId);
  if (f.name) query = query.ilike("employees.name", `%${f.name.replace(/[%_\\]/g, "\\$&")}%`);
  const { data, count, error } = await query.order("education_date", { ascending: false, nullsFirst: false })
    .order("employee_id").order("id").range((f.page - 1) * f.pageSize, f.page * f.pageSize - 1);
  throwIfError(error);
  const completions = (data ?? []).map(({ employees, education_resources, ...row }) => {
    const employee = (Array.isArray(employees) ? employees[0] : employees) as { name: string };
    const resource = (Array.isArray(education_resources) ? education_resources[0] : education_resources) as { title: string; youtube_link: string };
    return { ...row, employee_name: employee.name, resource_title: resource.title, resource_youtube_link: resource.youtube_link };
  });
  return { completions, total: count ?? 0, page: f.page, pageSize: f.pageSize };
}

export async function loadEducationDays(params: URLSearchParams, supabase = getSupabaseAdmin()) {
  const f = parseEducationFilters(params);
  const { data, error } = await supabase.rpc("education_completion_days", {
    p_name: f.name, p_from: f.from, p_to: f.to, p_type: f.type,
    p_offset: (f.page - 1) * f.pageSize, p_limit: f.pageSize,
  });
  throwIfError(error);
  return { ...(data as { rows: EducationDayRow[]; total: number }), page: f.page, pageSize: f.pageSize };
}

export async function resourceCompletionCounts(supabase = getSupabaseAdmin()) {
  return readAllEducationRows<{ resource_id: string; completed_count: number }>((from, to) =>
    supabase.rpc("education_resource_completion_counts").order("resource_id").range(from, to));
}

export async function markEducationCompletion(input: { employeeId: unknown; resourceId: unknown }, supabase = getSupabaseAdmin()) {
  const employeeId = typeof input.employeeId === "string" ? input.employeeId.trim() : "";
  const resourceId = typeof input.resourceId === "string" ? input.resourceId.trim() : "";
  if (!employeeId) throw new Error("직원 ID를 입력하세요.");
  if (!resourceId) throw new Error("교재 ID를 입력하세요.");
  const { data, error } = await supabase.rpc("complete_education", { p_employee_id: employeeId, p_resource_id: resourceId }).single();
  throwIfError(error);
  return data as Pick<EducationCompletionRow, "id" | "employee_id" | "resource_id" | "education_date" | "education_type" | "is_completed" | "completed_at">;
}

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
  if (f.from && f.to && f.from !== f.to) throw new Error("출근일은 하루만 선택할 수 있습니다.");
  const attendanceDate = f.from ?? f.to;
  if (!attendanceDate) return { rows: [], total: 0, page: f.page, pageSize: f.pageSize };

  type AttendanceRow = { employee_id: string; work_date: string; employees: { name: string } | { name: string }[] | null };
  const attendanceRows = await readAllEducationRows<AttendanceRow>((from, to) => {
    let query = supabase.from("work_record")
      .select("employee_id,work_date,employees!inner(name)")
      .eq("work_date", attendanceDate)
      .not("work_intime", "is", null);
    if (f.name) query = query.ilike("employees.name", `%${f.name.replace(/[%_\\]/g, "\\$&")}%`);
    return query.order("employee_id").range(from, to);
  });
  const attendedEmployees = attendanceRows.map((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    return { employee_id: row.employee_id, employee_name: employee?.name ?? "", education_date: row.work_date };
  }).sort((left, right) => left.employee_name.localeCompare(right.employee_name, "ko-KR") || left.employee_id.localeCompare(right.employee_id));

  const total = attendedEmployees.length;
  const pageEmployees = attendedEmployees.slice((f.page - 1) * f.pageSize, f.page * f.pageSize);
  if (!pageEmployees.length) return { rows: [], total, page: f.page, pageSize: f.pageSize };

  type CompletionRecord = Pick<EducationCompletionRow, "id" | "employee_id" | "resource_id" | "education_date" | "education_type" | "is_completed" | "completed_at">
    & { education_resources: { title: string } | { title: string }[] | null };
  const employeeIds = pageEmployees.map((employee) => employee.employee_id);
  const completions = await readAllEducationRows<CompletionRecord>((from, to) => {
    let query = supabase.from("education_completions")
      .select("id,employee_id,resource_id,education_date,education_type,is_completed,completed_at,education_resources!inner(title)")
      .eq("education_date", attendanceDate)
      .in("employee_id", employeeIds);
    if (f.type) query = query.eq("education_type", f.type);
    return query.range(from, to);
  });
  const priority = { semiannual: 0, quarterly: 1, monthly: 2, daily: 3 } as const;
  const itemsByEmployee = new Map<string, EducationDayRow["items"]>();
  completions.forEach((completion) => {
    const resource = Array.isArray(completion.education_resources) ? completion.education_resources[0] : completion.education_resources;
    const items = itemsByEmployee.get(completion.employee_id) ?? [];
    items.push({
      id: completion.id,
      resource_id: completion.resource_id,
      resource_title: resource?.title ?? "",
      education_type: completion.education_type,
      is_completed: completion.is_completed,
      completed_at: completion.completed_at,
    });
    itemsByEmployee.set(completion.employee_id, items);
  });

  const rows = pageEmployees.map((employee) => ({
    ...employee,
    items: (itemsByEmployee.get(employee.employee_id) ?? []).sort((left, right) =>
      priority[left.education_type] - priority[right.education_type]
      || left.resource_title.localeCompare(right.resource_title, "ko-KR")
      || left.id.localeCompare(right.id)),
  }));
  return { rows, total, page: f.page, pageSize: f.pageSize };
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

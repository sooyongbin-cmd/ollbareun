import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase-admin";
import { educationPeriodStart, educationToday, requireEducationType, type EducationType } from "./education-periods";

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

const educationTypeByKoreanName: Record<string, EducationType> = {
  "일일": "daily",
  "월간": "monthly",
  "분기": "quarterly",
  "반기": "semiannual",
  "기타": "other",
};
const koreanEducationTypeByType: Record<EducationType, string> = {
  daily: "일일",
  monthly: "월간",
  quarterly: "분기",
  semiannual: "반기",
  other: "기타",
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
  type ResourceSnapshot = Pick<EducationCompletionRow, "resource_id" | "resource_title" | "resource_youtube_link"> & {
    education_type: string;
  };
  type CompletionSnapshot = Pick<EducationCompletionRow, "id" | "employee_id" | "education_type" | "completed_at" | "education_date"> & {
    title: string;
  };
  const [resources, completions] = await Promise.all([
    readAllEducationRows<ResourceSnapshot>((from, to) => supabase.from("education_resources")
      .select("resource_id:id,resource_title:title,resource_youtube_link:youtube_link,education_type")
      .order("title").order("id").range(from, to)),
    readAllEducationRows<CompletionSnapshot>((from, to) => supabase.from("education_completions")
      .select("id,employee_id,title,education_type,completed_at,education_date:work_date")
      .order("employee_id").order("work_date", { ascending: false }).order("id").range(from, to)),
  ]);

  const resourceByTitle = new Map(resources.map((resource) => [resource.resource_title, resource]));
  const today = educationToday();
  const current = new Map<string, EducationCompletionRow>();

  for (const completion of completions) {
    const resource = resourceByTitle.get(completion.title);
    if (!resource || completion.education_type !== resource.education_type) continue;
    const educationType = educationTypeByKoreanName[resource.education_type];
    if (!educationType) continue;

    const completionDate = completion.education_date;
    if (!completionDate) continue;
    const periodStart = educationPeriodStart(educationType, today);
    if (completionDate < periodStart || completionDate > today) continue;

    const key = `${completion.employee_id}:${resource.resource_id}`;
    if (!current.has(key)) {
      current.set(key, {
        ...completion,
        employee_name: "",
        resource_id: resource.resource_id,
        resource_title: resource.resource_title,
        resource_youtube_link: resource.resource_youtube_link,
        education_type: educationType,
        is_completed: true,
      });
    }
  }

  return [...current.values()];
}

async function educationStatusForDate(employeeId: string, date: string, supabase: SupabaseClient) {
  type Resource = {
    id: string;
    title: string;
    youtube_link: string;
    created_at: string;
    education_type: string;
  };
  type Completion = {
    id: string;
    employee_id: string;
    title: string;
    work_date: string | null;
    education_type: string;
    completed_at: string | null;
  };

  const [resources, completions] = await Promise.all([
    readAllEducationRows<Resource>((from, to) => supabase.from("education_resources")
      .select("id,title,youtube_link,created_at,education_type")
      .order("title").order("id").range(from, to)),
    readAllEducationRows<Completion>((from, to) => supabase.from("education_completions")
      .select("id,employee_id,title,work_date,education_type,completed_at")
      .eq("employee_id", employeeId)
      .order("work_date", { ascending: false }).order("completed_at", { ascending: false }).range(from, to)),
  ]);

  const dateEnd = new Date(`${date}T23:59:59.999+09:00`).getTime();
  const resourcesBySnapshot = new Map<string, Resource[]>();
  for (const resource of resources) {
    const key = `${resource.title}\u0000${resource.education_type}`;
    const matches = resourcesBySnapshot.get(key) ?? [];
    matches.push(resource);
    resourcesBySnapshot.set(key, matches);
  }
  const latestCompletionByResource = new Map<string, Completion>();
  for (const completion of completions) {
    const matchingResources = resourcesBySnapshot.get(`${completion.title}\u0000${completion.education_type}`);
    if (!matchingResources?.length || !completion.work_date) continue;
    const educationType = educationTypeByKoreanName[completion.education_type];
    if (!educationType) continue;
    const periodStart = educationPeriodStart(educationType, date);
    if (completion.work_date < periodStart || completion.work_date > date) continue;
    for (const resource of matchingResources) {
      if (!latestCompletionByResource.has(resource.id)) latestCompletionByResource.set(resource.id, completion);
    }
  }

  return resources.flatMap((resource): EducationCompletionRow[] => {
    const educationType = educationTypeByKoreanName[resource.education_type];
    if (!educationType || new Date(resource.created_at).getTime() > dateEnd) return [];
    const completion = latestCompletionByResource.get(resource.id);
    return [{
      id: completion?.id ?? resource.id,
      employee_id: employeeId,
      employee_name: "",
      resource_id: resource.id,
      resource_title: resource.title,
      resource_youtube_link: resource.youtube_link,
      education_date: date,
      education_type: educationType,
      is_completed: Boolean(completion),
      completed_at: completion?.completed_at ?? null,
    }];
  });
}

export async function currentEducationStatus(employeeId: string, supabase = getSupabaseAdmin()) {
  return educationStatusForDate(employeeId, educationToday(), supabase);
}

export async function educationStatusForWorkDate(employeeId: string, workDate: string, supabase = getSupabaseAdmin()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)
    || !Number.isFinite(Date.parse(workDate))
    || new Date(workDate).toISOString().slice(0, 10) !== workDate) {
    throw new Error("출근 날짜를 확인할 수 없습니다.");
  }
  return educationStatusForDate(employeeId, workDate, supabase);
}

export type AttendanceEducationItem = {
  resourceId: string;
  title: string;
  educationType: EducationType;
  isCompleted: boolean;
  completedAt: string | null;
};

export async function attendanceEducationStatus(
  employeeId: string,
  workDate: string,
  supabase = getSupabaseAdmin(),
): Promise<AttendanceEducationItem[]> {
  if (!employeeId.trim()) throw new Error("직원 정보를 확인할 수 없습니다.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)
    || !Number.isFinite(Date.parse(workDate))
    || new Date(workDate).toISOString().slice(0, 10) !== workDate) {
    throw new Error("출근 날짜를 확인할 수 없습니다.");
  }

  const rows = await educationStatusForDate(employeeId, workDate, supabase);
  return rows.map((row) => ({
    resourceId: row.resource_id,
    title: row.resource_title,
    educationType: row.education_type,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
  }));
}

export async function markAttendanceEducationCompletions(input: {
  employeeId: string;
  workDate: string;
  resourceIds: string[];
}, supabase = getSupabaseAdmin()) {
  const selectedIds = [...new Set(input.resourceIds)];
  if (!selectedIds.length) return [];

  const available = await attendanceEducationStatus(input.employeeId, input.workDate, supabase);
  const byId = new Map(available.map((item) => [item.resourceId, item]));
  const unknownId = selectedIds.find((resourceId) => !byId.has(resourceId));
  if (unknownId) throw new Error("선택한 교육 자료를 확인할 수 없습니다.");

  const results = [];
  for (const resourceId of selectedIds) {
    const item = byId.get(resourceId)!;
    if (item.isCompleted) continue;
    results.push(await markEducationCompletion({
      employeeId: input.employeeId,
      resourceId,
      workDate: input.workDate,
    }, supabase));
  }
  return results;
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
  let resourceTitle: string | null = null;
  if (f.resourceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(f.resourceId)) {
    const { data, error } = await supabase.from("education_resources").select("title").eq("id", f.resourceId).maybeSingle();
    throwIfError(error);
    resourceTitle = data?.title ?? f.resourceId;
  } else if (f.resourceId) {
    resourceTitle = f.resourceId;
  }
  let query = supabase.from("education_completions")
    .select("id,employee_id,title,work_date,education_type,completed_at,employees!inner(name)", { count: "exact" });
  if (f.from) query = query.gte("work_date", f.from);
  if (f.to) query = query.lte("work_date", f.to);
  if (f.type) query = query.eq("education_type", koreanEducationTypeByType[f.type]);
  if (resourceTitle) query = query.eq("title", resourceTitle);
  if (f.employeeId) query = query.eq("employee_id", f.employeeId);
  if (f.name) query = query.ilike("employees.name", `%${f.name.replace(/[%_\\]/g, "\\$&")}%`);
  const { data, count, error } = await query.order("work_date", { ascending: false, nullsFirst: false })
    .order("employee_id").order("id").range((f.page - 1) * f.pageSize, f.page * f.pageSize - 1);
  throwIfError(error);
  const completions = (data ?? []).map(({ employees, ...row }) => {
    const employee = (Array.isArray(employees) ? employees[0] : employees) as { name: string };
    const educationType = educationTypeByKoreanName[row.education_type];
    return {
      ...row,
      employee_name: employee.name,
      resource_id: row.title,
      resource_title: row.title,
      resource_youtube_link: "",
      education_date: row.work_date,
      education_type: educationType,
      is_completed: true,
    };
  });
  return { completions, total: count ?? 0, page: f.page, pageSize: f.pageSize };
}

export async function loadEducationDays(params: URLSearchParams, supabase = getSupabaseAdmin()) {
  const f = parseEducationFilters(params);
  if (!f.from && !f.to) return { rows: [], total: 0, page: f.page, pageSize: f.pageSize };

  type AttendanceRow = { employee_id: string; work_date: string; employees: { name: string } | { name: string }[] | null };
  const attendanceRows = await readAllEducationRows<AttendanceRow>((from, to) => {
    let query = supabase.from("work_record")
      .select("employee_id,work_date,employees!inner(name)")
      .not("work_intime", "is", null);
    if (f.from) query = query.gte("work_date", f.from);
    if (f.to) query = query.lte("work_date", f.to);
    if (f.name) query = query.ilike("employees.name", `%${f.name.replace(/[%_\\]/g, "\\$&")}%`);
    return query.order("work_date", { ascending: false }).order("employee_id").range(from, to);
  });
  const attendedEmployees = attendanceRows.map((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    return { employee_id: row.employee_id, employee_name: employee?.name ?? "", education_date: row.work_date };
  }).sort((left, right) => left.employee_name.localeCompare(right.employee_name, "ko-KR")
    || left.employee_id.localeCompare(right.employee_id) || left.education_date.localeCompare(right.education_date));

  // Paginate whole employees so their attendance days stay together on one page.
  const employeeIds = [...new Set(attendedEmployees.map((employee) => employee.employee_id))];
  const total = employeeIds.length;
  const pageEmployeeIds = employeeIds.slice((f.page - 1) * f.pageSize, f.page * f.pageSize);
  const pageEmployeeIdSet = new Set(pageEmployeeIds);
  const pageEmployees = attendedEmployees.filter((employee) => pageEmployeeIdSet.has(employee.employee_id));
  if (!pageEmployees.length) return { rows: [], total, page: f.page, pageSize: f.pageSize };

  type CompletionRecord = Pick<EducationCompletionRow, "id" | "employee_id" | "completed_at"> & {
    title: string;
    work_date: string | null;
    education_type: string;
  };
  const completions = await readAllEducationRows<CompletionRecord>((from, to) => {
    let query = supabase.from("education_completions")
      .select("id,employee_id,title,work_date,education_type,completed_at")
      .in("employee_id", pageEmployeeIds);
    if (f.from) query = query.gte("work_date", f.from);
    if (f.to) query = query.lte("work_date", f.to);
    if (f.type) query = query.eq("education_type", koreanEducationTypeByType[f.type]);
    return query.order("employee_id").order("work_date").order("id").range(from, to);
  });
  const priority = { semiannual: 0, quarterly: 1, monthly: 2, daily: 3, other: 4 } as const;
  const itemsByAttendance = new Map<string, EducationDayRow["items"]>();
  completions.forEach((completion) => {
    const educationType = educationTypeByKoreanName[completion.education_type];
    if (!educationType || !completion.work_date) return;
    const key = `${completion.employee_id}:${completion.work_date}`;
    const items = itemsByAttendance.get(key) ?? [];
    items.push({
      id: completion.id,
      resource_id: completion.title,
      resource_title: completion.title,
      education_type: educationType,
      is_completed: true,
      completed_at: completion.completed_at,
    });
    itemsByAttendance.set(key, items);
  });

  const rows = pageEmployees.map((employee) => ({
    ...employee,
    items: (itemsByAttendance.get(`${employee.employee_id}:${employee.education_date}`) ?? []).sort((left, right) =>
      priority[left.education_type] - priority[right.education_type]
      || left.resource_title.localeCompare(right.resource_title, "ko-KR")
      || left.id.localeCompare(right.id)),
  }));
  return { rows, total, page: f.page, pageSize: f.pageSize };
}

export async function resourceCompletionCounts(supabase = getSupabaseAdmin()) {
  type Resource = { id: string; title: string };
  type Employee = { id: string };
  const [resources, employees, completions] = await Promise.all([
    readAllEducationRows<Resource>((from, to) => supabase.from("education_resources")
      .select("id,title").order("id").range(from, to)),
    readAllEducationRows<Employee>((from, to) => supabase.from("employees")
      .select("id").eq("is_retired", false).order("id").range(from, to)),
    listEducationCompletions(supabase),
  ]);
  const activeEmployees = new Set(employees.map((employee) => employee.id));
  const employeesByResource = new Map<string, Set<string>>();
  for (const completion of completions) {
    if (!activeEmployees.has(completion.employee_id)) continue;
    const employeesForResource = employeesByResource.get(completion.resource_id) ?? new Set<string>();
    employeesForResource.add(completion.employee_id);
    employeesByResource.set(completion.resource_id, employeesForResource);
  }
  return resources.map(({ id }) => ({ resource_id: id, completed_count: employeesByResource.get(id)?.size ?? 0 }));
}

export async function markEducationCompletion(input: { employeeId: unknown; resourceId: unknown; workDate?: unknown }, supabase = getSupabaseAdmin()) {
  const employeeId = typeof input.employeeId === "string" ? input.employeeId.trim() : "";
  const resourceId = typeof input.resourceId === "string" ? input.resourceId.trim() : "";
  if (!employeeId) throw new Error("직원 ID를 입력하세요.");
  if (!resourceId) throw new Error("교재 ID를 입력하세요.");

  const { data: resource, error: resourceError } = await supabase.from("education_resources")
    .select("id,title,education_type").eq("id", resourceId).single();
  throwIfError(resourceError);
  if (!resource) throw new Error("안전교육 자료를 찾을 수 없습니다.");

  const educationType = educationTypeByKoreanName[resource.education_type];
  if (!educationType) throw new Error("안전교육구분을 확인할 수 없습니다.");
  const workDate = typeof input.workDate === "string" ? input.workDate.trim() : educationToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)
    || !Number.isFinite(Date.parse(workDate))
    || new Date(workDate).toISOString().slice(0, 10) !== workDate) {
    throw new Error("교육 날짜를 확인하세요.");
  }
  const { data: existingCompletion, error: existingError } = await supabase.from("education_completions")
    .select("id,employee_id,title,work_date,education_type,completed_at")
    .eq("employee_id", employeeId).eq("title", resource.title)
    .eq("education_type", resource.education_type).eq("work_date", workDate)
    .limit(1).maybeSingle();
  throwIfError(existingError);

  const { data, error } = existingCompletion
    ? { data: existingCompletion, error: null }
    : await supabase.from("education_completions")
      .insert({
        employee_id: employeeId,
        title: resource.title,
        work_date: workDate,
        education_type: resource.education_type,
        completed_at: new Date().toISOString(),
      })
      .select("id,employee_id,title,work_date,education_type,completed_at")
      .single();
  throwIfError(error);
  if (!data) throw new Error("교육이수 저장 결과를 확인할 수 없습니다.");
  return {
    id: data.id,
    employee_id: data.employee_id,
    resource_id: resource.id,
    education_date: data.work_date,
    education_type: educationType,
    is_completed: true,
    completed_at: data.completed_at,
  };
}

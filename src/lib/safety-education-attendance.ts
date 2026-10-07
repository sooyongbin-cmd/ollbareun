import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { educationToday, educationTypes, educationTypeLabels, isEducationResourceForDate, type EducationType } from "@/lib/education-periods";

type AttendanceRecord = {
  employee_id: string;
  work_date: string;
  employees: { name: string } | { name: string }[] | null;
};

type CompletionRecord = {
  employee_id: string;
  work_date: string | null;
  education_type: string;
  completed_at: string | null;
  employees?: { name: string } | { name: string }[] | null;
};



export type DailyEducationAttendanceRow = {
  employeeId: string;
  employeeName: string;
} & Record<EducationType, number>;

export type EducationResourceCounts = Record<EducationType, number>;

export type MonthlyEducationSummaryRow = {
  employeeId: string;
  employeeName: string;
  monthly: number;
  quarterly: number;
  semiannual: number;
  other: number;
};

export type MonthlyEducationDetailRow = {
  employeeId: string;
  employeeName: string;
  workDate: string;
  daily: boolean;
  subjects: { resourceId: string; isCompleted: boolean | null }[];
};

function throwIfError(error: { message?: string } | null) {
  if (error) throw new Error(error.message || "교육이수 자료를 불러오지 못했습니다.");
}

async function readAll<T>(
  queryForPage: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await queryForPage(from, from + 499);
    throwIfError(error);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

function monthBounds(yearMonth: string) {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) throw new Error("조회 년월을 확인하세요.");
  const [year, month] = yearMonth.split("-").map(Number);
  const firstDate = new Date(Date.UTC(year, month - 1, 1));
  if (firstDate.toISOString().slice(0, 7) !== yearMonth) throw new Error("조회 년월을 확인하세요.");
  const nextMonth = new Date(Date.UTC(year, month, 1));
  return {
    from: `${yearMonth}-01`,
    to: new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    nextMonth: nextMonth.toISOString().slice(0, 10),
  };
}

function kstDateTime(date: string) {
  return `${date}T00:00:00+09:00`;
}

function employeeName(record: AttendanceRecord | CompletionRecord) {
  const relation = record.employees;
  const employee = Array.isArray(relation) ? relation[0] : relation;
  return employee?.name ?? "";
}

function getAttendanceQuery(dateFrom: string, dateToExclusive: string) {
  const start = kstDateTime(dateFrom);
  const end = kstDateTime(dateToExclusive);
  const supabase = getSupabaseAdmin();
  return (from: number, to: number) => supabase.from("work_record")
    .select("employee_id,work_date,employees!inner(name)")
    .not("work_intime", "is", null)
    .or(`and(work_intime.gte.${start},work_intime.lt.${end}),and(outtime.gte.${start},outtime.lt.${end})`)
    .order("work_date", { ascending: true })
    .order("employee_id", { ascending: true })
    .range(from, to);
}

function getWorkDateAttendanceQuery(dateFrom: string, dateToExclusive: string) {
  const supabase = getSupabaseAdmin();
  return (from: number, to: number) => supabase.from("work_record")
    .select("employee_id,work_date,employees!inner(name)")
    .gte("work_date", dateFrom)
    .lt("work_date", dateToExclusive)
    .not("work_intime", "is", null)
    .order("work_date", { ascending: false })
    .order("employee_id", { ascending: true })
    .range(from, to);
}

export async function loadDailyEducationAttendance(date = educationToday()): Promise<{
  rows: DailyEducationAttendanceRow[];
  resourceCounts: EducationResourceCounts;
}> {
  if (!isValidDate(date)) throw new Error("조회 날짜를 확인하세요.");
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const supabase = getSupabaseAdmin();
  type Resource = { id: string; title: string; education_type: string; startdate: string; enddate: string };
  const [attendanceRows, resourceRows] = await Promise.all([
    readAll<AttendanceRecord>(getAttendanceQuery(date, nextDate.toISOString().slice(0, 10))),
    readAll<Resource>((from, to) => supabase.from("education_resources")
      .select("id,title,education_type,startdate,enddate")
      .lte("startdate", date).gte("enddate", date).order("id").range(from, to)),
  ]);
  const resources = resourceRows.filter((resource) => isEducationResourceForDate(resource, date));
  const resourceCounts: EducationResourceCounts = { daily: 0, monthly: 0, quarterly: 0, semiannual: 0, other: 0 };
  const resourcesByType = new Map<EducationType, Resource[]>();
  for (const type of educationTypes) {
    const matches = resources.filter((resource) => resource.education_type === educationTypeLabels[type]);
    resourceCounts[type] = matches.length;
    resourcesByType.set(type, matches);
  }
  const namesByEmployee = new Map<string, string>();
  attendanceRows.forEach((record) => namesByEmployee.set(record.employee_id, employeeName(record)));
  const employeeIds = [...namesByEmployee.keys()];
  const completions = employeeIds.length && resources.length
    ? await readAll<CompletionRecord & { title: string }>((from, to) => supabase.from("education_completions")
      .select("employee_id,work_date,title,education_type,completed_at")
      .in("employee_id", employeeIds).eq("work_date", date)
      .order("id").range(from, to))
    : [];
  const completed = new Set(completions.filter((record) => record.work_date === date)
    .map((record) => JSON.stringify([record.employee_id, record.title, record.education_type])));
  const rows = employeeIds.map((id): DailyEducationAttendanceRow => {
    const counts: EducationResourceCounts = { daily: 0, monthly: 0, quarterly: 0, semiannual: 0, other: 0 };
    for (const type of educationTypes) {
      counts[type] = (resourcesByType.get(type) ?? []).filter((resource) =>
        completed.has(JSON.stringify([id, resource.title, resource.education_type]))).length;
    }
    return { employeeId: id, employeeName: namesByEmployee.get(id) ?? "", ...counts };
  }).sort((left, right) => left.employeeName.localeCompare(right.employeeName, "ko-KR") || left.employeeId.localeCompare(right.employeeId));
  return { rows, resourceCounts };
}

export async function loadMonthlyEducationAttendance(yearMonth: string) {
  const { from: monthStart, nextMonth } = monthBounds(yearMonth);
  const attendanceRows = await readAll<AttendanceRecord>(getAttendanceQuery(monthStart, nextMonth));
  const namesByEmployee = new Map<string, string>();
  attendanceRows.forEach((record) => namesByEmployee.set(record.employee_id, employeeName(record)));
  const employeeIds = [...namesByEmployee.keys()];

  const supabase = getSupabaseAdmin();
  type Resource = { id: string; title: string; education_type: string; startdate: string; enddate: string };
  const resources = (await readAll<Resource>((from, to) => supabase.from("education_resources")
    .select("id,title,education_type,startdate,enddate")
    .lte("startdate", monthStart).gte("enddate", monthStart).order("id").range(from, to)))
    .filter((resource) => isEducationResourceForDate(resource, monthStart));
  const resourceCounts: EducationResourceCounts = { daily: 0, monthly: 0, quarterly: 0, semiannual: 0, other: 0 };
  const monthlyTypes = ["monthly", "quarterly", "semiannual", "other"] as const;
  const resourcesByType = new Map<EducationType, Resource[]>();
  for (const type of monthlyTypes) {
    const matches = resources.filter((resource) => resource.education_type === educationTypeLabels[type]);
    resourceCounts[type] = matches.length;
    resourcesByType.set(type, matches);
  }
  const monthlyCompletions = employeeIds.length && resources.length
    ? await readAll<CompletionRecord & { title: string }>((from, to) => supabase.from("education_completions")
      .select("employee_id,work_date,title,education_type,completed_at")
      .in("employee_id", employeeIds).eq("work_date", monthStart)
      .order("id").range(from, to))
    : [];
  const completed = new Set(monthlyCompletions.filter((record) => record.work_date === monthStart)
    .map((record) => JSON.stringify([record.employee_id, record.title, record.education_type])));
  const summaryRows = employeeIds.map((id): MonthlyEducationSummaryRow => {
    const counts = { monthly: 0, quarterly: 0, semiannual: 0, other: 0 };
    for (const type of monthlyTypes) {
      counts[type] = (resourcesByType.get(type) ?? []).filter((resource) =>
        completed.has(JSON.stringify([id, resource.title, resource.education_type]))).length;
    }
    return { employeeId: id, employeeName: namesByEmployee.get(id) ?? "", ...counts };
  }).sort((left, right) => left.employeeName.localeCompare(right.employeeName, "ko-KR") || left.employeeId.localeCompare(right.employeeId));
  const detailAttendanceRows = await readAll<AttendanceRecord>(getWorkDateAttendanceQuery(monthStart, nextMonth));
  const detailEmployeeIds = [...new Set(detailAttendanceRows.map((record) => record.employee_id))];
  const detailWorkDates = [...new Set(detailAttendanceRows.map((record) => record.work_date))];
  const dailySubjects = (await readAll<Resource>((from, to) => supabase.from("education_resources")
    .select("id,title,education_type,startdate,enddate").eq("education_type", "일일")
    .lt("startdate", nextMonth).gte("enddate", monthStart).order("title").order("id").range(from, to)))
    .filter((resource) => resource.education_type === "일일" && resource.startdate < nextMonth && resource.enddate >= monthStart);
  let dailyDetailCompletions: (CompletionRecord & { title: string })[] = [];
  if (detailEmployeeIds.length && detailWorkDates.length) {
    const supabase = getSupabaseAdmin();
    dailyDetailCompletions = await readAll<CompletionRecord & { title: string }>((from, to) => supabase.from("education_completions")
      .select("employee_id,work_date,title,education_type,completed_at")
      .in("employee_id", detailEmployeeIds)
      .in("work_date", detailWorkDates)
      .eq("education_type", "일일")
      .order("employee_id", { ascending: true })
      .order("work_date", { ascending: true })
      .range(from, to));
  }

  const dailyDetailCompletionKeys = new Set(dailyDetailCompletions.map((record) => JSON.stringify([record.employee_id, record.work_date, record.title, record.education_type])));
  const detailByEmployeeDay = new Map<string, MonthlyEducationDetailRow>();
  detailAttendanceRows.forEach((record) => {
    const key = `${record.employee_id}:${record.work_date}`;
    const subjects = dailySubjects.map((resource) => ({ resourceId: resource.id,
      isCompleted: isEducationResourceForDate(resource, record.work_date)
        ? dailyDetailCompletionKeys.has(JSON.stringify([record.employee_id, record.work_date, resource.title, "일일"])) : null }));
    if (!detailByEmployeeDay.has(key)) detailByEmployeeDay.set(key, {
      employeeId: record.employee_id,
      employeeName: employeeName(record),
      workDate: record.work_date,
      daily: subjects.some((subject) => subject.isCompleted !== null) && subjects.every((subject) => subject.isCompleted !== false),
      subjects,
    });
  });
  const detailRows = [...detailByEmployeeDay.values()].sort((left, right) =>
    left.employeeName.localeCompare(right.employeeName, "ko-KR")
      || left.workDate.localeCompare(right.workDate)
      || left.employeeId.localeCompare(right.employeeId));

  return { summaryRows, detailRows, resourceCounts, dailySubjects: dailySubjects.map(({ id, title }) => ({ id, title })) };
}

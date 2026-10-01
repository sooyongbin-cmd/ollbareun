import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { educationToday, type EducationType } from "@/lib/education-periods";

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

type EducationMark = "daily" | "monthly" | "quarterly" | "semiannual";

export type DailyEducationAttendanceRow = {
  employeeId: string;
  employeeName: string;
  daily: boolean;
  monthly: boolean;
  quarterly: boolean;
  semiannual: boolean;
};

export type MonthlyEducationSummaryRow = Omit<DailyEducationAttendanceRow, "daily">;

export type MonthlyEducationDetailRow = {
  employeeId: string;
  employeeName: string;
  workDate: string;
  daily: boolean;
};

const educationMarkByLabel: Record<string, EducationMark | undefined> = {
  "일일": "daily",
  "월간": "monthly",
  "분기": "quarterly",
  "반기": "semiannual",
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

function periodStart(type: EducationType, yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const startMonth = type === "quarterly"
    ? Math.floor((month - 1) / 3) * 3 + 1
    : type === "semiannual"
      ? (month <= 6 ? 1 : 7)
      : month;
  return `${year}-${String(startMonth).padStart(2, "0")}-01`;
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

function completedKeys(records: CompletionRecord[]) {
  const keys = new Set<string>();
  records.forEach((record) => {
    if (!record.work_date || !record.completed_at) return;
    const mark = educationMarkByLabel[record.education_type];
    if (mark) keys.add(`${record.employee_id}:${record.work_date}:${mark}`);
  });
  return keys;
}

export async function loadDailyEducationAttendance(date = educationToday()): Promise<DailyEducationAttendanceRow[]> {
  if (!isValidDate(date)) throw new Error("조회 날짜를 확인하세요.");

  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextDateValue = nextDate.toISOString().slice(0, 10);
  const attendanceRows = await readAll<AttendanceRecord>(getAttendanceQuery(date, nextDateValue));
  const datesByEmployee = new Map<string, Set<string>>();
  const namesByEmployee = new Map<string, string>();
  attendanceRows.forEach((record) => {
    const dates = datesByEmployee.get(record.employee_id) ?? new Set<string>();
    dates.add(record.work_date);
    datesByEmployee.set(record.employee_id, dates);
    namesByEmployee.set(record.employee_id, employeeName(record));
  });

  const employeeIds = [...datesByEmployee.keys()];
  const workDates = [...new Set([...datesByEmployee.values()].flatMap((dates) => [...dates]))];
  let dailyCompletions: CompletionRecord[] = [];
  let periodCompletions: CompletionRecord[] = [];
  if (employeeIds.length && workDates.length) {
    const supabase = getSupabaseAdmin();
    const periodStartDate = periodStart("semiannual", date.slice(0, 7));
    [dailyCompletions, periodCompletions] = await Promise.all([
      readAll<CompletionRecord>((from, to) => supabase.from("education_completions")
        .select("employee_id,work_date,education_type,completed_at")
        .in("employee_id", employeeIds)
        .in("work_date", workDates)
        .eq("education_type", "일일")
        .order("employee_id", { ascending: true })
        .order("work_date", { ascending: true })
        .range(from, to)),
      readAll<CompletionRecord>((from, to) => supabase.from("education_completions")
        .select("employee_id,work_date,education_type,completed_at")
        .in("employee_id", employeeIds)
        .gte("work_date", periodStartDate)
        .lte("work_date", date)
        .in("education_type", ["월간", "분기", "반기"])
        .order("employee_id", { ascending: true })
        .order("work_date", { ascending: true })
        .range(from, to)),
    ]);
  }

  const completedDaily = completedKeys(dailyCompletions);
  const periodMarksByEmployee = new Map<string, Set<EducationMark>>();
  periodCompletions.forEach((record) => {
    if (!record.work_date || !record.completed_at) return;
    const mark = educationMarkByLabel[record.education_type];
    if (!mark || record.work_date < periodStart(mark, date.slice(0, 7)) || record.work_date > date) return;
    const marks = periodMarksByEmployee.get(record.employee_id) ?? new Set<EducationMark>();
    marks.add(mark);
    periodMarksByEmployee.set(record.employee_id, marks);
  });

  return employeeIds.map((id) => {
    const dates = datesByEmployee.get(id) ?? new Set<string>();
    return {
      employeeId: id,
      employeeName: namesByEmployee.get(id) ?? "",
      daily: [...dates].some((workDate) => completedDaily.has(`${id}:${workDate}:daily`)),
      monthly: periodMarksByEmployee.get(id)?.has("monthly") ?? false,
      quarterly: periodMarksByEmployee.get(id)?.has("quarterly") ?? false,
      semiannual: periodMarksByEmployee.get(id)?.has("semiannual") ?? false,
    };
  }).sort((left, right) => left.employeeName.localeCompare(right.employeeName, "ko-KR") || left.employeeId.localeCompare(right.employeeId));
}

export async function loadMonthlyEducationAttendance(yearMonth: string) {
  const { from: monthStart, to: monthEnd, nextMonth } = monthBounds(yearMonth);
  const attendanceRows = await readAll<AttendanceRecord>(getAttendanceQuery(monthStart, nextMonth));
  const namesByEmployee = new Map<string, string>();
  attendanceRows.forEach((record) => namesByEmployee.set(record.employee_id, employeeName(record)));
  const employeeIds = [...namesByEmployee.keys()];

  let monthlyCompletions: CompletionRecord[] = [];
  if (employeeIds.length) {
    const supabase = getSupabaseAdmin();
    const semiannualStart = periodStart("semiannual", yearMonth);
    monthlyCompletions = await readAll<CompletionRecord>((from, to) => supabase.from("education_completions")
      .select("employee_id,work_date,education_type,completed_at")
      .in("employee_id", employeeIds)
      .gte("work_date", semiannualStart)
      .lte("work_date", monthEnd)
      .in("education_type", ["월간", "분기", "반기"])
      .order("employee_id", { ascending: true })
      .order("work_date", { ascending: true })
      .range(from, to));
  }

  const completed = completedKeys(monthlyCompletions);
  const summaryRows = employeeIds.map((id) => {
    const hasInPeriod = (type: EducationType) => {
      const from = periodStart(type, yearMonth);
      return monthlyCompletions.some((record) => record.employee_id === id
        && record.work_date !== null
        && record.work_date >= from
        && record.work_date <= monthEnd
        && educationMarkByLabel[record.education_type] === type
        && completed.has(`${id}:${record.work_date}:${type}`));
    };
    return {
      employeeId: id,
      employeeName: namesByEmployee.get(id) ?? "",
      monthly: hasInPeriod("monthly"),
      quarterly: hasInPeriod("quarterly"),
      semiannual: hasInPeriod("semiannual"),
    };
  }).sort((left, right) => left.employeeName.localeCompare(right.employeeName, "ko-KR") || left.employeeId.localeCompare(right.employeeId));

  const supabase = getSupabaseAdmin();
  const detailRecords = await readAll<CompletionRecord>((from, to) => supabase.from("education_completions")
    .select("employee_id,work_date,education_type,completed_at,employees!inner(name)")
    .gte("work_date", monthStart)
    .lte("work_date", monthEnd)
    .order("work_date", { ascending: false })
    .order("employee_id", { ascending: true })
    .range(from, to));

  const detailByEmployeeDay = new Map<string, MonthlyEducationDetailRow>();
  detailRecords.forEach((record) => {
    if (!record.work_date) return;
    const key = `${record.employee_id}:${record.work_date}`;
    const current = detailByEmployeeDay.get(key) ?? {
      employeeId: record.employee_id,
      employeeName: employeeName(record),
      workDate: record.work_date,
      daily: false,
    };
    if (record.completed_at && educationMarkByLabel[record.education_type] === "daily") current.daily = true;
    detailByEmployeeDay.set(key, current);
  });

  const detailRows = [...detailByEmployeeDay.values()].sort((left, right) =>
    right.workDate.localeCompare(left.workDate)
      || left.employeeName.localeCompare(right.employeeName, "ko-KR")
      || left.employeeId.localeCompare(right.employeeId));

  return { summaryRows, detailRows };
}

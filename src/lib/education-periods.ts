export const educationTypes = ["daily", "monthly", "quarterly", "semiannual", "other"] as const;
export type EducationType = typeof educationTypes[number];
export function isEducationResourceForDate(resource: { startdate: string; enddate: string }, date: string) {
  return Boolean(resource.startdate && resource.enddate && resource.startdate <= date && date <= resource.enddate);
}
export const educationTypeLabels: Record<EducationType, string> = {
  daily: "일일", monthly: "월간", quarterly: "분기", semiannual: "반기", other: "기타",
};

export function requireEducationResourceDates(startValue: unknown, endValue: unknown) {
  const requireDate = (value: unknown, label: string) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}을 입력하세요.`);
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`올바른 ${label}을 입력하세요.`);
    return value;
  };
  const startdate = requireDate(startValue, "시작일");
  const enddate = requireDate(endValue, "종료일");
  if (enddate < startdate) throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
  return { startdate, enddate };
}

export function requireEducationType(value: unknown): EducationType {
  if (!educationTypes.includes(value as EducationType)) throw new Error("안전교육구분을 선택하세요.");
  return value as EducationType;
}

export function educationToday(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** datetime-local values in education forms always use Korean time. */
export function educationDateTimeLocal(date = new Date()) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19);
}

export function parseEducationCompletedAt(value: unknown) {
  const match = typeof value === "string"
    ? /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value)
    : null;
  if (!match) {
    throw new Error("이수(완료)일시를 입력하세요.");
  }
  const seconds = match[2] ?? "00";
  const milliseconds = (match[3] ?? "").padEnd(3, "0");
  const normalized = `${match[1]}:${seconds}`;
  const date = new Date(`${normalized}+09:00`);
  if (!Number.isFinite(date.getTime()) || educationDateTimeLocal(date) !== normalized
    || (milliseconds !== "" && date.toISOString().slice(20, 23) !== milliseconds)) {
    throw new Error("올바른 이수(완료)일시를 입력하세요.");
  }
  return date.toISOString();
}

export function educationPeriodStart(type: EducationType, date: string) {
  const [year, month] = date.split("-").map(Number);
  const startMonth = type === "quarterly" ? Math.floor((month - 1) / 3) * 3 + 1
    : type === "semiannual" ? (month <= 6 ? 1 : 7) : month;
  return type === "daily" ? date : `${year}-${String(startMonth).padStart(2, "0")}-01`;
}

export const educationChangedEvent = "education-changed";

export function notifyEducationChanged() {
  window.dispatchEvent(new Event(educationChangedEvent));
}

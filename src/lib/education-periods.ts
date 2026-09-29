export const educationTypes = ["daily", "monthly", "quarterly", "semiannual"] as const;
export type EducationType = typeof educationTypes[number];
export const educationTypeLabels: Record<EducationType, string> = {
  daily: "일일", monthly: "월간", quarterly: "분기", semiannual: "반기",
};

export function requireEducationType(value: unknown): EducationType {
  if (!educationTypes.includes(value as EducationType)) throw new Error("안전교육구분을 선택하세요.");
  return value as EducationType;
}

export function educationToday(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
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

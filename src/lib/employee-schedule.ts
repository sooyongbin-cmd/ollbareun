export const scheduleDayTypes = ["weekday", "saturday", "sunday", "holiday"] as const;
export type ScheduleDayType = typeof scheduleDayTypes[number];
export const scheduleDayLabels: Record<ScheduleDayType, string> = {
  weekday: "평일", saturday: "토요일", sunday: "일요일", holiday: "공휴일",
};
export type ScheduleRule = {
  day_type: ScheduleDayType;
  is_working_day: boolean;
  in_time: string | null;
  out_time: number | null;
};

export function elapsedTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function legacyScheduleRules(excludeWeekends: boolean): ScheduleRule[] {
  return excludeWeekends ? ["saturday", "sunday", "holiday"].map((day_type) => ({
    day_type: day_type as ScheduleDayType, is_working_day: false, in_time: null, out_time: null,
  })) : [];
}

export function employeeScheduleRules(employee: {
  schedule_rules_enabled?: boolean; schedule_rules?: ScheduleRule[]; has_weekend?: boolean;
}): ScheduleRule[] {
  return employee.schedule_rules_enabled ? employee.schedule_rules ?? [] : legacyScheduleRules(employee.has_weekend ?? false);
}

export function validateScheduleRules(value: unknown, workStyle: unknown): ScheduleRule[] {
  if (!Array.isArray(value) || value.length > 4) throw new Error("요일별 근무 설정이 올바르지 않습니다.");
  const seen = new Set<string>();
  return value.map((input) => {
    if (!input || typeof input !== "object" || !scheduleDayTypes.includes(input.day_type) || seen.has(input.day_type)
      || typeof input.is_working_day !== "boolean") throw new Error("요일별 근무 설정이 중복되었거나 올바르지 않습니다.");
    seen.add(input.day_type);
    if (!input.is_working_day) return { day_type: input.day_type, is_working_day: false, in_time: null, out_time: null };
    if (typeof input.in_time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(input.in_time)
      || !Number.isInteger(input.out_time) || input.out_time < 0 || input.out_time >= (workStyle === "0" ? 1440 : 3000)) {
      throw new Error(`${scheduleDayLabels[input.day_type as ScheduleDayType]} 출퇴근시간을 올바르게 입력하세요.`);
    }
    const start = Number(input.in_time.slice(0, 2)) * 60 + Number(input.in_time.slice(3, 5));
    if (input.out_time <= start) throw new Error("퇴근시간은 출근시간 이후로 입력하세요. 다음 날 퇴근은 24시간을 더해 입력하세요.");
    return { day_type: input.day_type, is_working_day: true, in_time: input.in_time.slice(0, 5), out_time: input.out_time };
  });
}

export function scheduleSummary(employee: {
  in_time?: string; has_weekend?: boolean; schedule_rules_enabled?: boolean; schedule_rules?: ScheduleRule[];
}) {
  const rules = employeeScheduleRules(employee);
  return scheduleDayTypes.map((day) => {
    const rule = rules.find((item) => item.day_type === day);
    return `${scheduleDayLabels[day]} ${rule ? rule.is_working_day ? rule.in_time?.slice(0, 5) : "휴무" : employee.in_time?.slice(0, 5) ?? "-"}`;
  }).join(" · ");
}

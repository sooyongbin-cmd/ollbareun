export type GuardWorkSchedule = {
  id: string;
  employee_id: string;
  worksite_id: string;
  work_date: string;
  intime: string | null;
  outtime: string | null;
  intime_status?: "0" | "1" | "2" | "3";
  work_intime: string | null;
  work_outtime: string | null;
};

export type GuardWorkAction = "none" | "clock-in" | "clock-out" | "complete";

export function selectGuardWorkSchedule(schedules: GuardWorkSchedule[]) {
  const orderedSchedules = [...schedules].sort((left, right) => left.work_date.localeCompare(right.work_date));
  return orderedSchedules.find((schedule) => !schedule.work_outtime)
    ?? orderedSchedules.at(-1)
    ?? null;
}

export function getGuardWorkAction(schedule: GuardWorkSchedule | null): GuardWorkAction {
  if (!schedule) return "none";
  if (schedule.work_outtime) return "complete";
  return schedule.work_intime ? "clock-out" : "clock-in";
}

export function formatGuardWorkDate(workDate: string) {
  const parsedDate = new Date(`${workDate}T12:00:00+09:00`);
  if (Number.isNaN(parsedDate.getTime())) return "근무일 미등록";

  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
  }).formatToParts(parsedDate);
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const weekday = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(parsedDate);
  return `${month}/${day} (${weekday})`;
}

export function formatGuardWorkTime(value: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(timestamp));
}

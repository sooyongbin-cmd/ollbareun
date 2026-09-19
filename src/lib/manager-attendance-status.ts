export type ManagerIntimeStatus = "0" | "1" | "2" | "3";

export type ManagerAttendanceStatus = "출근" | "지각" | "대기" | "결근";

export function getManagerAttendanceStatus(input: {
  intimeStatus: ManagerIntimeStatus | null | undefined;
  scheduledClockIn: string | null | undefined;
  now: Date;
}): ManagerAttendanceStatus {
  const intimeStatus = input.intimeStatus ?? "0";
  const scheduledTimestamp = input.scheduledClockIn ? new Date(input.scheduledClockIn).getTime() : Number.NaN;

  if (intimeStatus === "0" && Number.isFinite(scheduledTimestamp) && scheduledTimestamp > input.now.getTime()) {
    return "대기";
  }

  switch (intimeStatus) {
    case "1":
      return "지각";
    case "2":
    case "3":
      return "출근";
    default:
      return "결근";
  }
}

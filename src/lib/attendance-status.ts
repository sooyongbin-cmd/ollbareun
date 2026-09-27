export type AttendanceStatusCode = "0" | "1" | "2";

/** Derives work_record status codes from scheduled and actual clock times. */
export function deriveAttendanceStatuses(input: {
  scheduledIn?: string | null;
  scheduledOut?: string | null;
  workIn?: string | null;
  workOut?: string | null;
}) {
  const isLate = Boolean(input.workIn && input.scheduledIn && new Date(input.workIn).getTime() > new Date(input.scheduledIn).getTime());
  const isEarlyDeparture = Boolean(input.workOut && input.scheduledOut && new Date(input.workOut).getTime() < new Date(input.scheduledOut).getTime());

  return {
    intime_status: (isLate ? "1" : input.workIn ? "2" : "0") as AttendanceStatusCode,
    outtime_status: (input.workOut ? (isEarlyDeparture ? "1" : "2") : "0") as "0" | "1" | "2",
  };
}

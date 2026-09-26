export type AttendanceStatusCode = "0" | "1" | "2" | "3";

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
    intime_status: (input.workOut ? "3" : isLate ? "1" : input.workIn ? "2" : "0") as AttendanceStatusCode,
    outtime_status: (isEarlyDeparture ? "4" : null) as "4" | null,
  };
}

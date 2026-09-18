export type AttendanceTimes = {
  work_intime?: string | null;
  work_outtime?: string | null;
};

function seoulDate(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function getAttendanceStatus(attendance?: AttendanceTimes | null) {
  const today = seoulDate(new Date());
  const clockIn = attendance?.work_intime;
  const clockOut = attendance?.work_outtime;
  const isOpen = Boolean(clockIn && !clockOut);
  const clockedInToday = Boolean(clockIn && seoulDate(clockIn) === today);
  const clockedOutToday = Boolean(clockOut && seoulDate(clockOut) === today);
  return {
    isOpen,
    clockedOutToday,
    canStart: !isOpen && !clockedInToday && !clockedOutToday,
    showTimes: Boolean(clockIn && (clockedInToday || clockedOutToday || isOpen)),
  };
}

export function formatAttendanceTime(value: string) {
  return new Date(value).toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export function formatWorkingTime(clockIn: string, clockOut: string) {
  const minutes = Math.max(0, Math.floor((Date.parse(clockOut) - Date.parse(clockIn)) / 60000));
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}

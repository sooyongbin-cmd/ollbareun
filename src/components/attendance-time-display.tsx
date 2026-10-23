import type { AttendanceReportRow } from "@/lib/manager-reports";

type DateTimeDisplay = {
  text: string;
  differsFromQueryDate: boolean;
};

export function formatDateTimeSegment(value: string | null | undefined, queryDate: string, fallbackDate?: string): DateTimeDisplay {
  if (!value || value === "-") {
    return { text: "-", differsFromQueryDate: false };
  }

  const dateTime = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (dateTime) {
    const differsFromQueryDate = Boolean(queryDate && dateTime[1] !== queryDate);
    return {
      text: queryDate && dateTime[1] === queryDate ? dateTime[2] : `${Number(dateTime[1].slice(-2))}일 ${dateTime[2]}`,
      differsFromQueryDate,
    };
  }

  const time = value.match(/^(\d{2}:\d{2})$/);
  if (time && fallbackDate) {
    const differsFromQueryDate = Boolean(queryDate && fallbackDate !== queryDate);
    return {
      text: queryDate && fallbackDate === queryDate ? time[1] : `${Number(fallbackDate.slice(-2))}일 ${time[1]}`,
      differsFromQueryDate,
    };
  }

  return { text: value, differsFromQueryDate: false };
}

function formatDateTimeForQueryDate(value: string | null | undefined, queryDate: string, fallbackDate?: string) {
  return formatDateTimeSegment(value, queryDate, fallbackDate).text;
}

function scheduledClockIn(row: AttendanceReportRow, queryDate: string) {
  const value = row.scheduledClockIn === "-" ? "-" : `${row.workDate} ${row.scheduledClockIn}`;
  return formatDateTimeForQueryDate(value, queryDate, row.workDate);
}

export function scheduledClockInDisplay(row: AttendanceReportRow, queryDate: string) {
  const value = row.scheduledClockIn === "-" ? "-" : `${row.workDate} ${row.scheduledClockIn}`;
  return formatDateTimeSegment(value, queryDate, row.workDate);
}

function DateTimePart({ display }: { display: DateTimeDisplay }) {
  return (
    <span className={display.differsFromQueryDate ? "text-yellow-700 dark:text-yellow-300" : undefined}>
      {display.text}
    </span>
  );
}

export function DateTimeRange({
  start,
  end,
  omitMissing = false,
}: {
  start: DateTimeDisplay;
  end: DateTimeDisplay;
  omitMissing?: boolean;
}) {
  if (omitMissing && start.text === "-") return <DateTimePart display={end} />;
  if (omitMissing && end.text === "-") return <DateTimePart display={start} />;
  if (start.text === "-" && end.text === "-") return "-";

  return (
    <>
      <DateTimePart display={start} />
      {" ~ "}
      <DateTimePart display={end} />
    </>
  );
}

export function scheduledClockInOut(row: AttendanceReportRow, queryDate: string) {
  const clockIn = scheduledClockIn(row, queryDate);
  const clockOut = formatDateTimeForQueryDate(row.scheduledClockOut, queryDate, row.workDate);
  if (clockIn === "-") return clockOut;
  if (clockOut === "-") return clockIn;
  return `${clockIn} ~ ${clockOut}`;
}

export function clockInOut(row: AttendanceReportRow, queryDate: string) {
  const clockIn = formatDateTimeForQueryDate(row.clockInDateTime, queryDate, row.workDate);
  const clockOut = formatDateTimeForQueryDate(row.clockOutDateTime, queryDate, row.workDate);
  if (clockIn === "-" && clockOut === "-") return "-";
  return `${clockIn} ~ ${clockOut}`;
}


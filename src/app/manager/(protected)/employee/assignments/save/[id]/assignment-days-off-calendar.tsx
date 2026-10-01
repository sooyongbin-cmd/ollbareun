"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export type DailyAttendance = { id?: string; work_date: string; intime: string | null; outtime: string | null };

type Props = {
  dailyAttendance?: DailyAttendance[];
  startDate: string;
  endDate: string;
  currentMonth: string;
  daysOff: Set<string>;
  holidays?: Set<string>;
  onMonthChange: (month: string) => void;
};

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

function monthKey(date: string) {
  return date.slice(0, 7);
}

function shiftMonth(month: string, amount: number) {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year}년 ${Number(monthNumber)}월`;
}

function getMonthCells(month: string) {
  const firstDate = new Date(`${month}-01T00:00:00.000Z`);
  const year = firstDate.getUTCFullYear();
  const monthIndex = firstDate.getUTCMonth();
  const firstWeekday = firstDate.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    if (index < firstWeekday) return null;
    const day = index - firstWeekday + 1;
    return `${month}-${String(day).padStart(2, "0")}`;
  });
}

export default function AssignmentDaysOffCalendar({
  dailyAttendance = [],
  startDate,
  endDate,
  currentMonth,
  daysOff,
  holidays = new Set<string>(),
  onMonthChange,
}: Props) {
  const timesByDate = new Map<string, { intime: string[]; outtime: string[] }>();
  const attendanceIdByDate = new Map<string, string>();
  dailyAttendance.forEach((row) => {
    if (row.id && !attendanceIdByDate.has(row.work_date)) attendanceIdByDate.set(row.work_date, row.id);
    const workDateTimes = timesByDate.get(row.work_date) ?? { intime: [], outtime: [] };
    if (row.intime) workDateTimes.intime.push(row.intime);
    timesByDate.set(row.work_date, workDateTimes);

    if (row.outtime) {
      const outDate = new Date(row.outtime);
      const outDateKey = Number.isNaN(outDate.getTime())
        ? row.work_date
        : new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(outDate);
      if (row.id && !attendanceIdByDate.has(outDateKey)) attendanceIdByDate.set(outDateKey, row.id);
      const outDateTimes = timesByDate.get(outDateKey) ?? { intime: [], outtime: [] };
      outDateTimes.outtime.push(row.outtime);
      timesByDate.set(outDateKey, outDateTimes);
    }
  });
  const formatTime = (value: string) => new Date(value).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });
  const entriesByDate = new Map<string, { type: "출근" | "퇴근"; value: string }[]>();
  timesByDate.forEach((times, date) => {
    const entries = [
      ...times.intime.map((value) => ({ type: "출근" as const, value })),
      ...times.outtime.map((value) => ({ type: "퇴근" as const, value })),
    ];
    entries.sort((left, right) => formatTime(left.value).localeCompare(formatTime(right.value)));
    entriesByDate.set(date, entries);
  });
  const startMonth = monthKey(startDate);
  const endMonth = monthKey(endDate);
  const previousMonth = shiftMonth(currentMonth, -1);
  const nextMonth = shiftMonth(currentMonth, 1);
  const cells = getMonthCells(currentMonth);
  const trailingCells = (7 - (cells.length % 7)) % 7;

  return (
    <section className="mt-8 border-t border-border/60 pt-8">
      <div className="mx-auto max-w-[47.5rem] rounded-xl border border-border bg-background p-3 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <Button
            aria-label="이전 달"
            disabled={previousMonth < startMonth}
            onClick={() => onMonthChange(previousMonth)}
            type="button"
            variant="outline"
            size="icon"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <p className="text-lg font-semibold" aria-live="polite">
            {monthLabel(currentMonth)}
          </p>
          <Button
            aria-label="다음 달"
            disabled={nextMonth > endMonth}
            onClick={() => onMonthChange(nextMonth)}
            type="button"
            variant="outline"
            size="icon"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b border-border/60 pb-2 text-center text-sm font-semibold">
          {weekDays.map((day, index) => (
            <div
              className={index === 0 ? "text-destructive" : index === 6 ? "text-primary" : "text-muted-foreground"}
              key={day}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
          {cells.map((date, index) =>
            date ? (
              (() => {
                const dateObject = new Date(`${date}T00:00:00.000Z`);
                const isWeekend = dateObject.getUTCDay() === 0 || dateObject.getUTCDay() === 6;
                const isWeekendOrHoliday = isWeekend || holidays.has(date);
                const attendanceId = attendanceIdByDate.get(date);
                const withinAssignment = date >= startDate && date <= endDate;
                const className = [
                  "flex min-w-0 min-h-24 flex-col items-center justify-start gap-1 px-0.5 py-2 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50",
                  daysOff.has(date) || isWeekendOrHoliday
                    ? "border-transparent bg-orange-100/80 hover:border-orange-300 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"
                    : "border-transparent bg-muted/40 hover:border-primary/40 hover:bg-primary/10",
                  !withinAssignment || !attendanceId ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                ].join(" ");
                const contents = (
                  <>
                    <span>{Number(date.slice(-2))}</span>
                    {entriesByDate.get(date)?.map((entry, timeIndex) => (
                      <span className="text-[0.625rem] leading-tight sm:text-xs" key={`${entry.type}-${date}-${timeIndex}`}><span className="block sm:inline">{entry.type} </span>{formatTime(entry.value)}</span>
                    ))}
                    {daysOff.has(date) ? <span className="sr-only"> 휴무일</span> : null}
                  </>
                );

                return attendanceId && withinAssignment ? (
                  <Link
                    aria-label={`${date} 근태상세 보기`}
                    className={className}
                    href={`/manager/reports/attendance/detail/${encodeURIComponent(attendanceId)}`}
                    key={date}
                  >
                    {contents}
                  </Link>
                ) : (
                  <div aria-label={`${date} 근태자료 없음`} className={className} key={date}>
                    {contents}
                  </div>
                );
              })()
            ) : (
              <div aria-hidden="true" key={`empty-${index}`} />
            ),
          )}
          {Array.from({ length: trailingCells }, (_, index) => (
            <div aria-hidden="true" key={`trailing-${index}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

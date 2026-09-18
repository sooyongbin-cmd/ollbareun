"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type DailyAttendance = { work_date: string; intime: string | null; outtime: string | null };

type Props = {
  dailyAttendance?: DailyAttendance[];
  startDate: string;
  endDate: string;
  currentMonth: string;
  daysOff: Set<string>;
  pendingDate: string | null;
  disabled: boolean;
  onMonthChange: (month: string) => void;
  onToggle: (date: string) => void;
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
  pendingDate,
  disabled,
  onMonthChange,
  onToggle,
}: Props) {
  const timesByDate = new Map(dailyAttendance.map((row) => [row.work_date, row]));
  const formatTime = (value: string) => new Date(value).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });
  const startMonth = monthKey(startDate);
  const endMonth = monthKey(endDate);
  const previousMonth = shiftMonth(currentMonth, -1);
  const nextMonth = shiftMonth(currentMonth, 1);
  const cells = getMonthCells(currentMonth);
  const trailingCells = (7 - (cells.length % 7)) % 7;

  return (
    <section className="mt-8 border-t border-border/60 pt-8" aria-labelledby="days-off-calendar-title">
      <div className="mb-5 space-y-1">
        <h2 className="text-[1.5rem] font-semibold" id="days-off-calendar-title">
          휴무일 지정
        </h2>
        <p className="text-sm text-muted-foreground">
          근무기간 안의 날짜를 선택하면 즉시 휴무일로 저장됩니다.
        </p>
        {disabled ? (
          <p className="text-sm font-medium text-destructive" role="status">
            근무기간 변경 내용을 먼저 저장하세요.
          </p>
        ) : null}
      </div>

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
              <button
                aria-label={`${date} ${daysOff.has(date) ? "휴무일 해제" : "휴무일 지정"}`}
                aria-pressed={daysOff.has(date)}
                className={[
                  "flex min-w-0 min-h-24 flex-col items-center justify-start gap-1 px-0.5 py-2 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50",
                  daysOff.has(date)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-transparent bg-muted/40 hover:border-primary/40 hover:bg-primary/10",
                  date < startDate || date > endDate || disabled || pendingDate === date
                    ? "cursor-not-allowed opacity-40"
                    : "",
                ].join(" ")}
                disabled={date < startDate || date > endDate || disabled || pendingDate !== null}
                key={date}
                onClick={() => onToggle(date)}
                type="button"
              >
                <span>{Number(date.slice(-2))}</span>
                {timesByDate.get(date)?.intime ? (
                  <span className="text-[0.625rem] leading-tight sm:text-xs"><span className="block sm:inline">출근 </span>{formatTime(timesByDate.get(date)!.intime!)}</span>
                ) : null}
                {timesByDate.get(date)?.outtime ? (
                  <span className="text-[0.625rem] leading-tight sm:text-xs"><span className="block sm:inline">퇴근 </span>{formatTime(timesByDate.get(date)!.outtime!)}</span>
                ) : null}
                {daysOff.has(date) ? <span className="sr-only"> 휴무일</span> : null}
              </button>
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

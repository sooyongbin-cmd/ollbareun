"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../guard-session-storage";

import { getAttendanceStatus, type AttendanceTimes } from "./attendance-status";
import GuardLocationGateLink from "./guard-location-gate-link";

type ScheduledShift = {
  id?: unknown;
  work_date?: unknown;
  intime?: unknown;
  outtime?: unknown;
};

type GuardSession = {
  attendance?: AttendanceTimes | null;
  isDayOff?: boolean;
  employee?: {
    id?: unknown;
  } | null;
  worksite?: {
    id?: unknown;
    name?: unknown;
  } | null;
  assignment?: {
    id?: unknown;
    in_time?: unknown;
    out_time?: unknown;
  } | null;
  scheduledAttendances?: ScheduledShift[] | null;
};

function readGuardSessionSnapshot() {
  return readStoredGuardSessionSnapshot();
}

function subscribeToSessionChange(onStoreChange: () => void) {
  return subscribeToGuardSessionChange(onStoreChange);
}

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());
}

function formatTodayLabel() {
  const today = getTodayDate();
  const weekday = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(new Date());
  const [, month, day] = today.split("-");
  return `${month}/${day} (${weekday})`;
}

function toTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isCurrentShift(shift: ScheduledShift, now: number) {
  const start = toTimestamp(shift.intime);
  const end = toTimestamp(shift.outtime);
  if (start === null || end === null) return false;

  if (end >= start) return now >= start && now <= end;
  return now >= start || now <= end + 24 * 60 * 60 * 1000;
}

function getShiftTimestamp(shift: ScheduledShift) {
  return toTimestamp(shift.intime) ?? toTimestamp(shift.outtime) ?? 0;
}

function selectScheduledShift(shifts: ScheduledShift[], now: number) {
  const availableShifts = shifts.filter((shift) => toTimestamp(shift.intime) !== null || toTimestamp(shift.outtime) !== null);
  return availableShifts.find((shift) => isCurrentShift(shift, now))
    ?? [...availableShifts].sort((left, right) => getShiftTimestamp(right) - getShiftTimestamp(left))[0]
    ?? null;
}

function formatScheduledTime(value: unknown) {
  const timestamp = toTimestamp(value);
  if (timestamp === null) return null;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(timestamp));
}

function formatAssignmentTime(value: unknown) {
  if (typeof value !== "string" || !/^\d{2}:\d{2}/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;

  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getScheduleLabel(session: GuardSession | null, now: number) {
  const scheduledShift = selectScheduledShift(session?.scheduledAttendances ?? [], now);
  const scheduledStart = formatScheduledTime(scheduledShift?.intime);
  const scheduledEnd = formatScheduledTime(scheduledShift?.outtime);
  if (scheduledStart && scheduledEnd) return `${scheduledStart} - ${scheduledEnd}`;

  const assignmentStart = formatAssignmentTime(session?.assignment?.in_time);
  const assignmentEnd = formatAssignmentTime(session?.assignment?.out_time);
  if (assignmentStart && assignmentEnd) return `${assignmentStart} - ${assignmentEnd}`;

  return "근무시간 미등록";
}

export default function GuardWorksiteSection() {
  const storedSession = useSyncExternalStore(
    subscribeToSessionChange,
    readGuardSessionSnapshot,
    () => null,
  );
  const todayLabel = useMemo(() => formatTodayLabel(), []);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const session = useMemo(() => {
    if (!storedSession) return null;
    try {
      return JSON.parse(storedSession) as GuardSession;
    } catch {
      return null;
    }
  }, [storedSession]);

  const attendanceStatus = getAttendanceStatus(session?.attendance);
  const hasAssignedWorksite = Boolean(session?.worksite?.id && session?.worksite?.name);
  const worksiteName = typeof session?.worksite?.name === "string" ? session.worksite.name : null;

  return (
    <section className="guard-work-card">
      <div className="guard-work-card-content">
        <div className="guard-work-heading">
          <h1 className="guard-title-text">오늘 근무</h1>
          <p className="guard-blue-emphasis-text">{worksiteName || "근무지 미배정"}</p>
        </div>

        <div className="guard-schedule-row">
          <div className="guard-schedule-details">
            <p className="guard-date-emphasis-text">{todayLabel}</p>
            <div className="guard-schedule-time-row">
              <p className="guard-body-text">{getScheduleLabel(session, now)}</p>
              <span className="guard-attendance-status" role="status">
                {attendanceStatus.clockedOutToday ? "근무완료" : attendanceStatus.isOpen ? "퇴근가능" : "출근가능"}
              </span>
            </div>
          </div>
        </div>

        <GuardLocationGateLink
          buttonClassName="guard-general-button"
          href="/guard/main/attendance"
          hasAssignedWorksite={hasAssignedWorksite}
          variant="default"
        >
          {attendanceStatus.clockedOutToday ? "금일 근무 완료" : attendanceStatus.isOpen ? "퇴근하기" : "출근하기"}
        </GuardLocationGateLink>
      </div>
    </section>
  );
}

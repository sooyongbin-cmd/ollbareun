import { describe, expect, it, vi } from "vitest";
import { loadGuardProfile } from "./guard-profile";

const supabaseMocks = vi.hoisted(() => ({
  getSupabase: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("./supabase", () => ({ getSupabase: supabaseMocks.getSupabase }));
vi.mock("./supabase-admin", () => ({ getSupabaseAdmin: supabaseMocks.getSupabaseAdmin }));

import {
  buildGuardProfile,
  getRecentOneYearDateRange,
  type GuardProfileAttendanceInput,
  type GuardProfileDayOffInput,
  type GuardProfileScheduleInput,
  type GuardProfileScheduledAttendanceInput,
  type GuardProfileWorksiteInput,
} from "./guard-profile";

const schedules: GuardProfileScheduleInput[] = [
  {
    id: "assign-2",
    employee_id: "emp-1",
    worksite_id: "work-2",
    start_date: "2026-06-01",
    end_date: "2026-06-30",
  },
  {
    id: "assign-1",
    employee_id: "emp-1",
    worksite_id: "work-1",
    start_date: "2026-05-01",
    end_date: "2026-05-31",
  },
  {
    id: "assign-other",
    employee_id: "emp-2",
    worksite_id: "work-3",
    start_date: "2026-04-01",
    end_date: "2026-04-30",
  },
];

const worksites: GuardProfileWorksiteInput[] = [
  { id: "work-1", name: "본사" },
  { id: "work-2", name: "문현동현장" },
];

type QueryResult = { data: unknown; error: null };

function createQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lte.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockResolvedValue(result);
  query.maybeSingle.mockResolvedValue(result);
  return query;
}

describe("guard profile data", () => {
  it("loads assignment schedules and planned attendance through the privileged client", async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    const queries = {
      employees: createQuery({ data: { work_style: "1" }, error: null }),
      work_assignments: createQuery({
        data: [{
          id: "assign-1",
          employee_id: "emp-1",
          worksite_id: "work-1",
          start_date: today,
          end_date: today,
          in_time: "09:00:00",
          out_time: "18:00:00",
        }],
        error: null,
      }),
      worksites: createQuery({ data: worksites, error: null }),
      attendance_records: createQuery({ data: [], error: null }),
      work_assignment_daily_attendance: createQuery({
        data: [{ work_assignment_id: "assign-1", work_date: today, intime: `${today}T00:00:00.000Z`, outtime: null }],
        error: null,
      }),
      work_assignment_days_off: createQuery({ data: [], error: null }),
    };
    const adminClient = { from: vi.fn((table: keyof typeof queries) => queries[table]) };
    supabaseMocks.getSupabase.mockImplementation(() => {
      throw new Error("profile queries must not use the publishable client");
    });
    supabaseMocks.getSupabaseAdmin.mockReturnValue(adminClient);

    const profile = await loadGuardProfile("emp-1");

    expect(profile.schedules).toEqual([{ id: "assign-1", period: `${today} ~ ${today}`, worksiteName: "본사" }]);
    expect(profile.plannedAttendance).toEqual([
      {
        assignmentId: "assign-1",
        workDate: today,
        inTime: `${today}T00:00:00.000Z`,
        outTime: null,
        isDayOff: false,
      },
    ]);
    expect(supabaseMocks.getSupabase).not.toHaveBeenCalled();
    expect(adminClient.from).toHaveBeenCalledWith("work_assignments");
    expect(adminClient.from).toHaveBeenCalledWith("work_assignment_daily_attendance");
  });

  it("includes the employee work style returned by the profile lookup", () => {
    expect(
      buildGuardProfile({
        employeeId: "emp-1",
        workStyle: "2",
        schedules: [],
        worksites: [],
        attendance: [],
      }).workStyle,
    ).toBe("2");
  });

  it("sorts the guard work schedule by period", () => {
    expect(
      buildGuardProfile({
        employeeId: "emp-1",
        today: "2026-06-04",
        schedules,
        worksites,
        attendance: [],
      }).schedules,
    ).toEqual([
      { id: "assign-1", period: "2026-05-01 ~ 2026-05-31", worksiteName: "본사" },
      { id: "assign-2", period: "2026-06-01 ~ 2026-06-30", worksiteName: "문현동현장" },
    ]);
  });

  it("returns the employee's planned attendance and future days off for weekly schedule rendering", () => {
    const scheduledAttendance: GuardProfileScheduledAttendanceInput[] = [
      { work_assignment_id: "assign-1", work_date: "2026-09-14", intime: "2026-09-14T21:00:00.000Z", outtime: null },
      { work_assignment_id: "assign-1", work_date: "2026-09-18", intime: "2026-09-18T21:00:00.000Z", outtime: null },
      { work_assignment_id: "assign-1", work_date: "2026-09-21", intime: null, outtime: "2026-09-21T21:00:00.000Z" },
      { work_assignment_id: "assign-other", work_date: "2026-09-18", intime: "2026-09-18T21:00:00.000Z", outtime: null },
    ];
    const daysOff: GuardProfileDayOffInput[] = [
      { work_assignment_id: "assign-1", day_off_date: "2026-09-19" },
      { work_assignment_id: "assign-1", day_off_date: "2026-09-13" },
      { work_assignment_id: "assign-other", day_off_date: "2026-09-19" },
    ];

    const profile = buildGuardProfile({
      employeeId: "emp-1",
      today: "2026-09-18",
      schedules: [
        { ...schedules[1], start_date: "2026-09-14", end_date: "2026-09-22" },
        schedules[2],
      ],
      worksites,
      attendance: [],
      scheduledAttendance,
      daysOff,
    });

    expect(profile.plannedAttendance).toEqual([
      {
        assignmentId: "assign-1",
        workDate: "2026-09-14",
        inTime: "2026-09-14T21:00:00.000Z",
        outTime: null,
        isDayOff: false,
      },
      {
        assignmentId: "assign-1",
        workDate: "2026-09-18",
        inTime: "2026-09-18T21:00:00.000Z",
        outTime: null,
        isDayOff: false,
      },
      {
        assignmentId: "assign-1",
        workDate: "2026-09-21",
        inTime: null,
        outTime: "2026-09-21T21:00:00.000Z",
        isDayOff: false,
      },
    ]);
    expect(profile.plannedDaysOff).toEqual([
      { assignmentId: "assign-1", workDate: "2026-09-19" },
    ]);
  });

  it("summarizes monthly attendance for the recent one year in month order", () => {
    const attendance: GuardProfileAttendanceInput[] = [
      {
        employee_id: "emp-1",
        work_date: "2025-06-03",
        clock_in_at: "2025-06-03T00:00:00.000Z",
        clock_out_at: "2025-06-03T09:00:00.000Z",
      },
      {
        employee_id: "emp-1",
        work_date: "2025-06-04",
        clock_in_at: "2025-06-04T00:00:00.000Z",
        clock_out_at: "2025-06-04T09:00:00.000Z",
      },
      {
        employee_id: "emp-1",
        work_date: "2026-05-01",
        clock_in_at: "2026-05-01T00:00:00.000Z",
        clock_out_at: "2026-05-01T08:30:00.000Z",
      },
      {
        employee_id: "emp-1",
        work_date: "2026-05-02",
        clock_in_at: "2026-05-02T00:00:00.000Z",
        clock_out_at: null,
      },
      {
        employee_id: "emp-1",
        work_date: "2026-05-03",
        clock_in_at: "2026-05-03T09:00:00.000Z",
        clock_out_at: "2026-05-03T08:00:00.000Z",
      },
      {
        employee_id: "emp-1",
        work_date: "2026-06-04",
        clock_in_at: "2026-06-04T00:00:00.000Z",
        clock_out_at: "2026-06-04T01:15:00.000Z",
      },
      {
        employee_id: "emp-2",
        work_date: "2026-06-04",
        clock_in_at: "2026-06-04T00:00:00.000Z",
        clock_out_at: "2026-06-04T01:00:00.000Z",
      },
    ];

    expect(
      buildGuardProfile({
        employeeId: "emp-1",
        today: "2026-06-04",
        schedules,
        worksites,
        attendance,
      }).monthlyAttendance,
    ).toEqual([
      { yearMonth: "2025-06", attendanceDays: 1, workHoursTotal: "9시간" },
      { yearMonth: "2026-05", attendanceDays: 3, workHoursTotal: "8시간 30분" },
      { yearMonth: "2026-06", attendanceDays: 1, workHoursTotal: "1시간 15분" },
    ]);
  });

  it("calculates the recent one year range from today", () => {
    expect(getRecentOneYearDateRange("2026-06-04")).toEqual({
      startDate: "2025-06-04",
      endDate: "2026-06-04",
    });
  });
});

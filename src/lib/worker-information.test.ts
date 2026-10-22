import { describe, expect, it, vi } from "vitest";
vi.mock("./supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));
import {
  buildWorkerInformation,
  workerSchedule,
  type WorkerEmployee,
} from "./worker-information";
import { requireBirthdate } from "./employee-birthdate";
const employee: WorkerEmployee = {
  id: "a",
  name: "홍길동",
  birthdate: "1966-01-01",
  phone: "01012345678",
  role: "경비원",
  in_time: "08:00:00",
  out_time: 1080,
  has_weekend: true,
};
const record = {
  id: "r",
  employee_id: "a",
  work_date: "2026-10-02",
  intime: "2026-10-02T08:00:00+09:00",
  outtime: "2026-10-02T18:00:00+09:00",
  intime_status: "0" as const,
  outtime_status: "0",
  work_intime: null,
  work_outtime: null,
};
const base = {
  employees: [employee],
  assignments: [],
  worksites: [],
  records: [],
  resources: [],
  completions: [],
  leaves: [],
  reports: [],
  now: new Date("2026-10-22T00:00:00Z"),
};
describe("worker information", () => {
  it("counts scheduled absences, late arrival, early departure and leave days separately, excluding waiting shifts", () => {
    const [row] = buildWorkerInformation({
      ...base,
      records: [
        record,
        {
          ...record,
          id: "late",
          work_date: "2026-10-03",
          intime_status: "1",
          outtime_status: "1",
          work_intime: "2026-10-03T09:00:00+09:00",
        },
        {
          ...record,
          id: "annual",
          work_date: "2026-10-04",
          intime_status: "3",
        },
        { ...record, id: "leave", work_date: "2026-10-05", intime_status: "3" },
        { ...record, id: "future", intime: "2026-10-23T08:00:00+09:00" },
      ],
      leaves: [
        {
          employee_id: "a",
          start_date: "2026-10-04",
          end_date: "2026-10-04",
          leave_type: "연차",
        },
      ],
      reports: [{ employee_id: "a" }, { employee_id: "a" }],
    });
    expect(row.attendance).toEqual({
      결근: 1,
      조퇴: 1,
      지각: 1,
      연차: 1,
      휴가: 1,
    });
    expect(row.remarks).toBe(2);
  });
  it("counts daily education per attended work date and non-daily subjects once, matching monthly education", () => {
    const [row] = buildWorkerInformation({
      ...base,
      records: [
        { ...record, work_intime: "2026-10-02T08:00:00+09:00" },
        {
          ...record,
          id: "second",
          work_date: "2026-10-03",
          work_intime: "2026-10-03T08:00:00+09:00",
        },
      ],
      resources: [
        {
          id: "daily",
          title: "일일교육",
          education_type: "일일",
          startdate: "2026-10-01",
          enddate: "2026-10-31",
        },
        {
          id: "monthly",
          title: "월간교육",
          education_type: "월간",
          startdate: "2026-10-01",
          enddate: "2026-10-31",
        },
      ],
      completions: [
        {
          employee_id: "a",
          work_date: "2026-10-02",
          title: "일일교육",
          education_type: "일일",
        },
        {
          employee_id: "a",
          work_date: "2026-10-02",
          title: "월간교육",
          education_type: "월간",
        },
        {
          employee_id: "a",
          work_date: "2026-10-03",
          title: "월간교육",
          education_type: "월간",
        },
      ],
    });
    expect(row.education.slice(0, 2)).toEqual([
      { label: "일일", completed: 1, total: 2 },
      { label: "월간", completed: 1, total: 1 },
    ]);
  });
  it("sorts by worksite then employee name", () => {
    const rows = buildWorkerInformation({
      ...base,
      employees: [
        employee,
        { ...employee, id: "b", name: "김길동" },
        { ...employee, id: "c", name: "박길동" },
      ],
      worksites: [
        { id: "z", name: "하남" },
        { id: "a", name: "강남" },
      ],
      assignments: [
        {
          id: "1",
          employee_id: "a",
          worksite_id: "z",
          start_date: "2026-01-01",
          end_date: "2026-12-31",
        },
        ...["b", "c"].map((id) => ({
          id,
          employee_id: id,
          worksite_id: "a",
          start_date: "2026-01-01",
          end_date: "2026-12-31",
        })),
      ],
    });
    expect(rows.map((row) => row.name)).toEqual(["김길동", "박길동", "홍길동"]);
  });
  it("shows overridden clock times, elapsed next-day hours and inherited days off", () => {
    expect(
      workerSchedule({
        ...employee,
        out_time: 1800,
        schedule_rules_enabled: true,
        schedule_rules: [
          {
            day_type: "weekday",
            is_working_day: false,
            in_time: null,
            out_time: null,
          },
          {
            day_type: "saturday",
            is_working_day: true,
            in_time: "09:00",
            out_time: 1020,
          },
        ],
      }),
    ).toEqual({
      clockIn: "08:00 · 토요일 09:00",
      clockOut: "30:00 · 토요일 17:00",
      daysOff: "월요일, 화요일, 수요일, 목요일, 금요일",
    });
  });
  it("rejects impossible birthdates", () => {
    expect(() => requireBirthdate("2026-02-30")).toThrow();
    expect(requireBirthdate("1966-01-01")).toBe("1966-01-01");
  });
});

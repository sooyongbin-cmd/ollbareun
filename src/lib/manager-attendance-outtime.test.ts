import { describe, expect, it } from "vitest";
import { buildAttendanceReport } from "./manager-reports";

describe("attendance report clock-out visibility", () => {
  it.each([
    { name: "대기의 미퇴근 숨김", inStatus: "0", outStatus: "0", start: "20:00:00", end: "21:00:00", expected: "" },
    { name: "대기의 퇴근 숨김", inStatus: "0", outStatus: "2", start: "20:00:00", end: "21:00:00", expected: "" },
    { name: "결근의 미퇴근 숨김", inStatus: "0", outStatus: "0", expected: "" },
    { name: "결근의 조퇴 숨김", inStatus: "0", outStatus: "1", expected: "" },
    { name: "결근의 퇴근 숨김", inStatus: "0", outStatus: "2", expected: "" },
    { name: "퇴근예정 1초 전 미퇴근 숨김", inStatus: "2", outStatus: "0", end: "18:00:01", expected: "" },
    { name: "지각도 퇴근예정 전 미퇴근 숨김", inStatus: "1", outStatus: "0", end: "19:00:00", expected: "" },
    { name: "퇴근예정 정각 미퇴근 표시", inStatus: "2", outStatus: "0", expected: "미퇴근" },
    { name: "퇴근예정 이후 미퇴근 표시", inStatus: "1", outStatus: "0", end: "17:59:59", expected: "미퇴근" },
    { name: "퇴근예정 전 조퇴 표시", inStatus: "2", outStatus: "1", end: "19:00:00", expected: "조퇴" },
    { name: "퇴근예정 전 퇴근 표시", inStatus: "2", outStatus: "2", end: "19:00:00", expected: "퇴근" },
  ])("$name", ({ inStatus, outStatus, start, end, expected }) => {
    const [row] = buildAttendanceReport({
      now: new Date("2026-09-29T09:00:00Z"),
      employeeName: "", workDate: "2026-09-29",
      employees: [{ id: "employee-1", name: "직원" }],
      attendance: [{
        id: "record-1", employee_id: "employee-1", work_date: "2026-09-29",
        intime: `2026-09-29T${start ?? "09:00:00"}+09:00`,
        outtime: `2026-09-29T${end ?? "18:00:00"}+09:00`,
        intime_status: inStatus as "0" | "1" | "2", outtime_status: outStatus as "0" | "1" | "2",
        work_intime: inStatus === "0" ? null : "2026-09-29T00:00:00Z", work_outtime: null,
      }],
    });
    expect(row.outtimeLabel).toBe(expected);
    expect(row.outtimeStatus).toBe(outStatus);
  });
});

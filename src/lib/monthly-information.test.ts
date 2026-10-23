import { beforeEach, expect, it, vi } from "vitest";
import { loadMonthlyInformation } from "./monthly-information";
import { loadMonthlyAttendance, type MonthlyAttendanceRow } from "./monthly-attendance";
import { loadMonthlyEducationAttendance } from "./safety-education-attendance";
import { listSpecialRemarkReports } from "./special-remark-reports";
vi.mock("./monthly-attendance", () => ({ loadMonthlyAttendance: vi.fn() }));
vi.mock("./safety-education-attendance", () => ({ loadMonthlyEducationAttendance: vi.fn() }));
vi.mock("./special-remark-reports", () => ({ listSpecialRemarkReports: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

it("reuses monthly education counts and links remarks by employee ID, site ID and Korean work date", async () => {
  const attendance = (id: string, employeeId: string, workDate: string, worksiteId = "w1") => ({
    id, employeeId, worksiteId, workDate, employeeName: "동명이인",
  } as MonthlyAttendanceRow);
  vi.mocked(loadMonthlyAttendance).mockResolvedValue([
    attendance("a", "e1", "2026-10-23"), attendance("b", "e1", "2026-10-24"), attendance("c", "e2", "2026-10-23"),
    attendance("d", "e1", "2026-10-23", "w2"), attendance("e", "e3", "2026-10-23"),
  ]);
  vi.mocked(loadMonthlyEducationAttendance).mockResolvedValue({
    resourceCounts: { daily: 3, monthly: 2, quarterly: 1, semiannual: 0, other: 1 }, dailySubjects: [],
    summaryRows: [
      { employeeId: "e1", employeeName: "동명이인", monthly: 1, quarterly: 0, semiannual: 0, other: 1 },
      { employeeId: "e2", employeeName: "동명이인", monthly: 0, quarterly: 0, semiannual: 0, other: 0 },
    ],
    detailRows: [
      { employeeId: "e1", employeeName: "동명이인", workDate: "2026-10-23", daily: false,
        subjects: [{ resourceId: "s1", isCompleted: true }, { resourceId: "s2", isCompleted: false }, { resourceId: "s3", isCompleted: null }] },
      { employeeId: "e1", employeeName: "동명이인", workDate: "2026-10-24", daily: true, subjects: [{ resourceId: "s1", isCompleted: true }] },
    ],
  });
  const report = (id: string, employee_id: string | null, worksite_id: string, reported_at: string) => ({
    id, employee_id, worksite_id, reported_at, content: id,
  } as Awaited<ReturnType<typeof listSpecialRemarkReports>>[number]);
  vi.mocked(listSpecialRemarkReports).mockResolvedValue([
    report("r1", "e1", "w1", "2026-10-22T15:01:00Z"), report("r2", "e1", "w1", "2026-10-23T12:00:00Z"),
    report("r3", "e2", "w1", "2026-10-23T12:00:00Z"), report("r4", "e1", "w2", "2026-10-23T12:00:00Z"),
    report("r5", "e1", "w1", "2026-10-24T01:00:00Z"), report("unknown", null, "w1", "2026-10-23T12:00:00Z"),
  ]);
  const rows = await loadMonthlyInformation("2026-10");
  expect(rows[0].education).toEqual({ daily: "2/3", monthly: "O", quarterly: "X", semiannual: "-", other: "O" });
  expect(rows[1].education).toEqual(rows[0].education);
  expect(rows[2].education).toEqual({ daily: "-", monthly: "X", quarterly: "X", semiannual: "-", other: "X" });
  expect(rows[4].education).toEqual({ daily: "-", monthly: "-", quarterly: "-", semiannual: "-", other: "-" });
  expect(rows.map((row) => row.remarks.map((remark) => remark.id))).toEqual([["r1", "r2"], ["r5"], ["r3"], ["r4"], []]);
  expect(loadMonthlyAttendance).toHaveBeenCalledWith("2026-10");
  expect(loadMonthlyEducationAttendance).toHaveBeenCalledWith("2026-10");
  expect(listSpecialRemarkReports).toHaveBeenCalledWith({ yearMonth: "2026-10", includePhotos: false });
});
it("rejects invalid months before any data query", async () => {
  await expect(loadMonthlyInformation("")).rejects.toThrow("조회년월을 확인하세요.");
  expect(loadMonthlyAttendance).not.toHaveBeenCalled();
  expect(loadMonthlyEducationAttendance).not.toHaveBeenCalled();
  expect(listSpecialRemarkReports).not.toHaveBeenCalled();
});

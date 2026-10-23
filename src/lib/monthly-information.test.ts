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
    id, employeeId, worksiteId, workDate, employeeName: "동명이인", status: "출근",
  } as MonthlyAttendanceRow);
  vi.mocked(loadMonthlyAttendance).mockResolvedValue([
    attendance("a", "e1", "2026-10-23"), attendance("b", "e1", "2026-10-24"), attendance("c", "e2", "2026-10-23"),
    attendance("d", "e1", "2026-10-23", "w2"), attendance("e", "e3", "2026-10-23"),
  ]);
  vi.mocked(loadMonthlyEducationAttendance).mockResolvedValue({
    resourceCounts: { daily: 3, monthly: 2, quarterly: 1, semiannual: 0, other: 1 }, dailySubjects: [],
    summaryRows: [
      { employeeId: "e1", employeeName: "동명이인", monthly: 1, quarterly: 0, semiannual: 0, other: 1, completedAt: { monthly: "2026-10-23T08:01:00Z", other: "2026-10-23T15:05:00Z" } },
      { employeeId: "e2", employeeName: "동명이인", monthly: 0, quarterly: 0, semiannual: 0, other: 0 },
    ],
    detailRows: [
      { employeeId: "e1", employeeName: "동명이인", workDate: "2026-10-23", daily: false,
        subjects: [{ resourceId: "s1", isCompleted: true }, { resourceId: "s2", isCompleted: false }, { resourceId: "s3", isCompleted: null }] },
      { employeeId: "e1", employeeName: "동명이인", workDate: "2026-10-24", daily: true, dailyCompletedAt: "2026-10-24T00:05:00Z", subjects: [{ resourceId: "s1", isCompleted: true }] },
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
  expect(rows[0].education).toEqual({ daily: "X", monthly: "17:01", quarterly: "X", semiannual: "-", other: "00:05" });
  expect(rows[1].education).toEqual({ ...rows[0].education, daily: "09:05" });
  expect(rows[2].education).toEqual({ daily: "X", monthly: "X", quarterly: "X", semiannual: "-", other: "X" });
  expect(rows[4].education).toEqual({ daily: "X", monthly: "-", quarterly: "-", semiannual: "-", other: "-" });
  expect(rows.map((row) => row.remarks.map((remark) => remark.id))).toEqual([["r1", "r2"], ["r5"], ["r3"], ["r4"], []]);
  expect(loadMonthlyAttendance).toHaveBeenCalledWith("2026-10");
  expect(loadMonthlyEducationAttendance).toHaveBeenCalledWith("2026-10");
  expect(listSpecialRemarkReports).toHaveBeenCalledWith({ yearMonth: "2026-10", includePhotos: false });
});
it("hides daily and quarterly through annual education for leave, waiting and absent rows", async () => {
  vi.mocked(loadMonthlyAttendance).mockResolvedValue(["휴가", "대기", "결근", "출근", "지각"].map((status, index) => ({
    id: String(index), employeeId: "e", workDate: "2026-10-23", status,
  } as MonthlyAttendanceRow)));
  vi.mocked(loadMonthlyEducationAttendance).mockResolvedValue({
    resourceCounts: { daily: 1, monthly: 1, quarterly: 1, semiannual: 1, other: 1 }, dailySubjects: [],
    summaryRows: [{ employeeId: "e", employeeName: "직원", monthly: 1, quarterly: 1, semiannual: 1, other: 1,
      completedAt: { monthly: "2026-10-23T00:01:00Z", quarterly: "2026-10-23T00:02:00Z", semiannual: "2026-10-23T00:03:00Z", other: "2026-10-23T00:04:00Z" } }],
    detailRows: [{ employeeId: "e", employeeName: "직원", workDate: "2026-10-23", daily: true,
      dailyCompletedAt: "2026-10-23T00:05:00Z", subjects: [{ resourceId: "d", isCompleted: true }] }],
  });
  vi.mocked(listSpecialRemarkReports).mockResolvedValue([]);
  const rows = await loadMonthlyInformation("2026-10");
  expect(rows.map((row) => row.education.daily)).toEqual(["-", "-", "-", "09:05", "09:05"]);
  for (const row of rows.slice(0, 3)) {
    expect(row.education).toEqual({ daily: "-", monthly: "09:01", quarterly: "-", semiannual: "-", other: "-" });
  }
  expect(rows[3].education).toEqual({ daily: "09:05", monthly: "09:01", quarterly: "09:02", semiannual: "09:03", other: "09:04" });
  vi.mocked(loadMonthlyEducationAttendance).mockResolvedValue({
    resourceCounts: { daily: 1, monthly: 1, quarterly: 1, semiannual: 1, other: 1 }, dailySubjects: [],
    summaryRows: [{ employeeId: "e", employeeName: "직원", monthly: 0, quarterly: 0, semiannual: 0, other: 0 }],
    detailRows: [{ employeeId: "e", employeeName: "직원", workDate: "2026-10-23", daily: false,
      subjects: [{ resourceId: "d", isCompleted: false }] }],
  });
  const incompleteRows = await loadMonthlyInformation("2026-10");
  for (const row of incompleteRows.slice(0, 3)) {
    expect(row.education).toEqual({ daily: "-", monthly: "X", quarterly: "-", semiannual: "-", other: "-" });
  }
  for (const row of incompleteRows.slice(3)) {
    expect(row.education).toEqual({ daily: "X", monthly: "X", quarterly: "X", semiannual: "X", other: "X" });
  }
});
it("rejects invalid months before any data query", async () => {
  await expect(loadMonthlyInformation("")).rejects.toThrow("조회년월을 확인하세요.");
  expect(loadMonthlyAttendance).not.toHaveBeenCalled();
  expect(loadMonthlyEducationAttendance).not.toHaveBeenCalled();
  expect(listSpecialRemarkReports).not.toHaveBeenCalled();
});

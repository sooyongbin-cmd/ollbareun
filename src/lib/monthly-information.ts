import type { EducationType } from "./education-periods";
import { loadMonthlyAttendance, type MonthlyAttendanceRow } from "./monthly-attendance";
import { loadMonthlyEducationAttendance } from "./safety-education-attendance";
import { listSpecialRemarkReports } from "./special-remark-reports";

export type MonthlyInformationEducation = Record<EducationType, string>;
export type MonthlyInformationRemark = { id: string; reportedAt: string; content: string };
export type MonthlyInformationRow = MonthlyAttendanceRow & {
  education: MonthlyInformationEducation;
  remarks: MonthlyInformationRemark[];
};

/** Uses the monthly education screen's employee-level counts and applicable subjects. */
export function buildMonthlyEducationOverview(input: Awaited<ReturnType<typeof loadMonthlyEducationAttendance>>) {
  const dailyByEmployee = new Map<string, { completed: number; total: number }>();
  for (const detail of input.detailRows) {
    const counts = dailyByEmployee.get(detail.employeeId) ?? { completed: 0, total: 0 };
    for (const subject of detail.subjects) {
      if (subject.isCompleted !== null) counts.total += 1;
      if (subject.isCompleted === true) counts.completed += 1;
    }
    dailyByEmployee.set(detail.employeeId, counts);
  }
  const byEmployee = new Map<string, MonthlyInformationEducation>();
  for (const summary of input.summaryRows) {
    const daily = dailyByEmployee.get(summary.employeeId);
    const status = (type: "monthly" | "quarterly" | "semiannual" | "other") =>
      input.resourceCounts[type] === 0 ? "-" : summary[type] > 0 ? "O" : "X";
    byEmployee.set(summary.employeeId, {
      daily: daily?.total ? `${daily.completed}/${daily.total}` : "-",
      monthly: status("monthly"), quarterly: status("quarterly"), semiannual: status("semiannual"), other: status("other"),
    });
  }
  return byEmployee;
}

export async function loadMonthlyInformation(yearMonth: string): Promise<MonthlyInformationRow[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error("조회년월을 확인하세요.");
  const [attendance, education, reports] = await Promise.all([
    loadMonthlyAttendance(yearMonth), loadMonthlyEducationAttendance(yearMonth), listSpecialRemarkReports({ yearMonth, includePhotos: false }),
  ]);
  const educationByEmployee = buildMonthlyEducationOverview(education);
  const remarksByEmployeeSiteDay = new Map<string, MonthlyInformationRemark[]>();
  const kstDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });
  const key = (employeeId: string, worksiteId: string | null, date: string) => JSON.stringify([employeeId, worksiteId, date]);
  for (const report of reports) {
    if (!report.employee_id || !report.worksite_id) continue;
    const reportKey = key(report.employee_id, report.worksite_id, kstDate.format(new Date(report.reported_at)));
    const items = remarksByEmployeeSiteDay.get(reportKey) ?? [];
    items.push({ id: report.id, reportedAt: report.reported_at, content: report.content });
    remarksByEmployeeSiteDay.set(reportKey, items);
  }
  return attendance.map((row) => ({
    ...row,
    education: educationByEmployee.get(row.employeeId) ?? { daily: "-", monthly: "-", quarterly: "-", semiannual: "-", other: "-" },
    remarks: remarksByEmployeeSiteDay.get(key(row.employeeId, row.worksiteId, row.workDate)) ?? [],
  }));
}

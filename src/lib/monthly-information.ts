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

function completionTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(value));
}

/** Uses the monthly education screen's employee-level counts and applicable subjects. */
export function buildMonthlyEducationOverview(input: Awaited<ReturnType<typeof loadMonthlyEducationAttendance>>) {
  const byEmployee = new Map<string, MonthlyInformationEducation>();
  for (const summary of input.summaryRows) {
    const status = (type: "monthly" | "quarterly" | "semiannual" | "other") =>
      input.resourceCounts[type] === 0 ? "-" : summary[type] > 0 ? completionTime(summary.completedAt?.[type]) : "X";
    byEmployee.set(summary.employeeId, {
      daily: "-",
      monthly: status("monthly"), quarterly: status("quarterly"), semiannual: status("semiannual"), other: status("other"),
    });
  }
  return byEmployee;
}

export async function loadMonthlyInformation(yearMonth: string, employeeId?: string): Promise<MonthlyInformationRow[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error("조회년월을 확인하세요.");
  const [attendance, education, reports] = await Promise.all([
    (employeeId ? loadMonthlyAttendance(yearMonth, employeeId) : loadMonthlyAttendance(yearMonth)), (employeeId ? loadMonthlyEducationAttendance(yearMonth, employeeId) : loadMonthlyEducationAttendance(yearMonth)), listSpecialRemarkReports({ yearMonth, includePhotos: false, ...(employeeId ? { employeeId } : {}) }),
  ]);
  const educationByEmployee = buildMonthlyEducationOverview(education);
  const dailyByEmployeeDay = new Map(education.detailRows.map((detail) => {
    const applicable = detail.subjects.some((subject) => subject.isCompleted !== null);
    const time = detail.dailyCompletedAt;
    const value = !applicable ? "-" : !detail.daily ? "X" : completionTime(time);
    return [JSON.stringify([detail.employeeId, detail.workDate]), value];
  }));
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
  return attendance.map((row) => {
    const hideEducation = row.status === "휴가" || row.status === "대기" || row.status === "결근";
    const summary = educationByEmployee.get(row.employeeId);
    return {
      ...row,
      education: {
        monthly: summary?.monthly ?? "-",
        quarterly: hideEducation ? "-" : summary?.quarterly ?? "-",
        semiannual: hideEducation ? "-" : summary?.semiannual ?? "-",
        other: hideEducation ? "-" : summary?.other ?? "-",
        daily: hideEducation ? "-" : dailyByEmployeeDay.get(JSON.stringify([row.employeeId, row.workDate])) ?? "X",
      },
      remarks: remarksByEmployeeSiteDay.get(key(row.employeeId, row.worksiteId, row.workDate)) ?? [],
    };
  });
}

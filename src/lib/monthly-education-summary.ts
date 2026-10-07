import type { EducationResourceCounts, MonthlyEducationDetailRow, MonthlyEducationSummaryRow } from "./safety-education-attendance";

const monthlyEducationTypes = ["monthly", "quarterly", "semiannual", "other"] as const;

export function calculateMonthlyEducationSummary(
  summaryRows: MonthlyEducationSummaryRow[],
  detailRows: MonthlyEducationDetailRow[],
  resourceCounts: EducationResourceCounts,
) {
  const summaryCompleted = summaryRows.reduce((count, row) =>
    count + monthlyEducationTypes.reduce((sum, type) => sum + row[type], 0), 0);
  const dailyCompleted = detailRows.reduce((count, row) =>
    count + row.subjects.filter((subject) => subject.isCompleted === true).length, 0);
  const dailyTotal = detailRows.reduce((count, row) =>
    count + row.subjects.filter((subject) => subject.isCompleted !== null).length, 0);
  const total = summaryRows.length * monthlyEducationTypes.reduce((sum, type) => sum + resourceCounts[type], 0) + dailyTotal;
  const completed = summaryCompleted + dailyCompleted;
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
}

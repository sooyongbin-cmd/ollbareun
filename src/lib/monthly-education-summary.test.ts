import { describe, expect, it } from "vitest";
import { calculateMonthlyEducationSummary } from "./monthly-education-summary";
import { buildManagerDashboardData } from "./manager-dashboard";

describe("monthly education dashboard totals", () => {
  it("counts every resource, other education and applicable daily subjects", () => {
    const monthlyEducationAttendance = {
      summaryRows: [{ employeeId: "e1", employeeName: "직원", monthly: 2, quarterly: 1, semiannual: 0, other: 1 }],
      detailRows: [{ employeeId: "e1", employeeName: "직원", workDate: "2026-10-01", daily: false, subjects: [
        { resourceId: "d1", isCompleted: true },
        { resourceId: "d2", isCompleted: false },
        { resourceId: "d3", isCompleted: null },
      ] }],
      resourceCounts: { daily: 3, monthly: 3, quarterly: 1, semiannual: 0, other: 2 },
      dailySubjects: [],
    };
    const totals = calculateMonthlyEducationSummary(monthlyEducationAttendance.summaryRows, monthlyEducationAttendance.detailRows, monthlyEducationAttendance.resourceCounts);
    expect(totals).toEqual({ completed: 5, total: 8, percent: 63 });
    const { summary } = buildManagerDashboardData({
      employees: [], employeeRoles: [], worksites: [], assignments: [], attendance: [], dailyAttendance: [],
      educationResources: [], educationCompletions: [], monthlyEducationAttendance,
    });
    expect(summary).toMatchObject({ educationCompleted: 5, educationUncompleted: 3, educationRate: 63 });
  });

  it("returns zero for a month without required education", () => {
    expect(calculateMonthlyEducationSummary([], [], { daily: 0, monthly: 0, quarterly: 0, semiannual: 0, other: 0 }))
      .toEqual({ completed: 0, total: 0, percent: 0 });
  });
});

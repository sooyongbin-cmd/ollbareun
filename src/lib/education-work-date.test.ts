import { describe, expect, it, vi } from "vitest";
import { attendanceEducationStatus, markEducationCompletion } from "./education-completions";

describe("work-date education eligibility", () => {
  it("uses inclusive resource dates, category ordering and only that employee's exact-day completions", async () => {
    const resources = [
      { id: "other", title: "기타", education_type: "기타", startdate: "2026-10-07", enddate: "2026-10-07" },
      { id: "quarterly", title: "분기", education_type: "분기", startdate: "2026-10-01", enddate: "2026-10-07" },
      { id: "daily", title: "일일", education_type: "일일", startdate: "2026-10-07", enddate: "2026-10-31" },
      { id: "monthly", title: "월간", education_type: "월간", startdate: "2026-10-01", enddate: "2026-10-31" },
      { id: "old", title: "이전", education_type: "일일", startdate: "2026-10-01", enddate: "2026-10-06" },
      { id: "future", title: "이후", education_type: "반기", startdate: "2026-10-08", enddate: "2026-10-31" },
    ].map((row) => ({ ...row, youtube_link: "https://youtu.be/test", created_at: "2026-10-08T00:00:00Z" }));
    const completions = [
      { id: "c1", employee_id: "e", title: "분기", education_type: "분기", work_date: "2026-10-07", completed_at: null },
      { id: "c2", employee_id: "e", title: "월간", education_type: "월간", work_date: "2026-10-06", completed_at: null },
      { id: "c3", employee_id: "other", title: "일일", education_type: "일일", work_date: "2026-10-07", completed_at: null },
    ];
    const queries: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
    const db = { from: vi.fn((table: string) => {
      const q = { select: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: table === "education_resources" ? resources : completions, error: null }) };
      queries[table] = q;
      return q;
    }) };
    const result = await attendanceEducationStatus("e", "2026-10-07", db as never);
    expect(result.map((row) => [row.resourceId, row.isCompleted])).toEqual([["daily", false], ["monthly", false], ["quarterly", true], ["other", false]]);
    expect(queries.education_resources.lte).toHaveBeenCalledWith("startdate", "2026-10-07");
    expect(queries.education_resources.gte).toHaveBeenCalledWith("enddate", "2026-10-07");
    expect(queries.education_completions.eq).toHaveBeenCalledWith("work_date", "2026-10-07");
  });
  it("rejects out-of-range completion attempts before writing", async () => {
    const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "r", title: "교육", education_type: "일일", startdate: "2026-10-08", enddate: "2026-10-31" }, error: null }) };
    const db = { from: vi.fn(() => q) };
    await expect(markEducationCompletion({ employeeId: "e", resourceId: "r", workDate: "2026-10-07" }, db as never)).rejects.toThrow("출근날짜에 해당하는");
    expect(db.from.mock.calls).toEqual([["education_resources"]]);
  });
});

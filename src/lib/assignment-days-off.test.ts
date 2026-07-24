import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAssignmentDayOffCounts, requireDayOffDate } from "./assignment-days-off";
import { getSupabaseAdmin } from "./supabase-admin";

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("assignment days off validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a valid ISO date", () => {
    expect(requireDayOffDate("2026-05-22")).toBe("2026-05-22");
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => requireDayOffDate("2026/05/22")).toThrow("휴무일 형식이 올바르지 않습니다.");
    expect(() => requireDayOffDate("2026-02-31")).toThrow("휴무일 형식이 올바르지 않습니다.");
  });

  it("counts assignment days off through the server admin client", async () => {
    const query = {
      select: vi.fn().mockResolvedValue({
        data: [
          { work_assignment_id: "assign-1" },
          { work_assignment_id: "assign-1" },
          { work_assignment_id: "assign-2" },
        ],
        error: null,
      }),
    };
    const supabaseAdmin = {
      from: vi.fn().mockReturnValue(query),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabaseAdmin as never);

    await expect(getAssignmentDayOffCounts()).resolves.toEqual(
      new Map([
        ["assign-1", 2],
        ["assign-2", 1],
      ]),
    );
    expect(supabaseAdmin.from).toHaveBeenCalledWith("work_assignment_days_off");
  });
});

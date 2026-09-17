import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import { listEducationCompletions, markEducationCompletion } from "./education-completions";

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("education completions", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("reads completions through the server admin client", async () => {
    const completionsQuery = {
      select: vi.fn(),
      order: vi.fn(),
    };
    completionsQuery.select.mockReturnValue(completionsQuery);
    completionsQuery.order.mockReturnValue(completionsQuery);
    completionsQuery.order.mockImplementationOnce(() => completionsQuery).mockResolvedValueOnce({ data: [], error: null });

    const employeesQuery = { select: vi.fn() };
    employeesQuery.select.mockResolvedValue({ data: [], error: null });
    const resourcesQuery = { select: vi.fn() };
    resourcesQuery.select.mockResolvedValue({ data: [], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "education_completions") return completionsQuery;
        if (table === "employees") return employeesQuery;
        return resourcesQuery;
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as never);

    await expect(listEducationCompletions()).resolves.toEqual([]);
    expect(getSupabaseAdmin).toHaveBeenCalledOnce();
  });

  it("writes a completion through the server admin client", async () => {
    const completionQuery = {
      upsert: vi.fn(),
    };
    const upsertQuery = {
      select: vi.fn(),
    };
    const singleQuery = {
      single: vi.fn().mockResolvedValue({
        data: {
          employee_id: "employee-1",
          resource_id: "resource-1",
          is_completed: true,
          completed_at: "2026-09-17T00:00:00.000Z",
        },
        error: null,
      }),
    };
    completionQuery.upsert.mockReturnValue(upsertQuery);
    upsertQuery.select.mockReturnValue(singleQuery);
    const supabase = { from: vi.fn().mockReturnValue(completionQuery) };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as never);

    await expect(
      markEducationCompletion({ employeeId: "employee-1", resourceId: "resource-1" }),
    ).resolves.toMatchObject({ employee_id: "employee-1", resource_id: "resource-1", is_completed: true });
    expect(getSupabaseAdmin).toHaveBeenCalledOnce();
    expect(completionQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ employee_id: "employee-1", resource_id: "resource-1", is_completed: true }),
      { onConflict: "employee_id,resource_id" },
    );
  });
});

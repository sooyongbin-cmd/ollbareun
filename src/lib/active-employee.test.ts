import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import { InactiveEmployeeError, requireActiveEmployee } from "./active-employee";

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function createEmployeeLookup(result: {
  data: { id: string; is_retired: boolean } | null;
  error: { message?: string } | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from };
}

describe("requireActiveEmployee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts an active employee", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      createEmployeeLookup({
        data: { id: "employee-1", is_retired: false },
        error: null,
      }) as never,
    );

    await expect(requireActiveEmployee("employee-1")).resolves.toEqual({ id: "employee-1" });
  });

  it("rejects retired and deleted employees", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      createEmployeeLookup({
        data: { id: "employee-1", is_retired: true },
        error: null,
      }) as never,
    );
    await expect(requireActiveEmployee("employee-1")).rejects.toBeInstanceOf(InactiveEmployeeError);

    vi.mocked(getSupabaseAdmin).mockReturnValue(
      createEmployeeLookup({ data: null, error: null }) as never,
    );
    await expect(requireActiveEmployee("employee-1")).rejects.toBeInstanceOf(InactiveEmployeeError);
  });
});

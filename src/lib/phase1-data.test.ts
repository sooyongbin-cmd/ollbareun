import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateGuard } from "./phase1-data";
import { getSupabase } from "./supabase";

vi.mock("./supabase", () => ({
  getSupabase: vi.fn(),
}));

describe("guard authentication data rules", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects retired employees before creating a guard session", async () => {
    const employeeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "emp-1",
          name: "홍길동",
          phone: "010-1234-5678",
          phone_normalized: "01012345678",
          is_retired: true,
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue(employeeQuery),
    };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(
      authenticateGuard({ name: "홍길동", phone: "010-1234-5678" }),
    ).rejects.toThrow("해당직원은 퇴직처리되었습니다.");
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("employees");
  });
});

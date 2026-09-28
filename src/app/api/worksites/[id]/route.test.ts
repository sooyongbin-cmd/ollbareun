import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { deleteWorksite } from "@/lib/phase1-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { DELETE } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/phase1-data", () => ({
  deleteWorksite: vi.fn(),
  getWorksiteById: vi.fn(),
  updateWorksite: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("DELETE /api/worksites/[id]", () => {
  const adminClient = {};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(adminClient as never);
  });

  it("returns the assignment error without deleting the worksite", async () => {
    vi.mocked(deleteWorksite).mockRejectedValue(
      new Error("근무지배정 자료가 있어서 삭제할 수 없습니다."),
    );

    const response = await DELETE(
      new Request("http://localhost/api/worksites/work-1"),
      { params: Promise.resolve({ id: "work-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "근무지배정 자료가 있어서 삭제할 수 없습니다.",
    });
    expect(deleteWorksite).toHaveBeenCalledWith("work-1", adminClient);
  });
});

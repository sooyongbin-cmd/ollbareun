import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { POST } from "./route";

vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

describe("retired attendance education generation", () => {
  it("requires manager authentication", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);
    expect((await POST()).status).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("rejects generation from older pages without accessing the database", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager" } as never);
    const response = await POST();
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({ error: "안전교육 이수자료는 교육 이수 시에만 생성됩니다." });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });
});

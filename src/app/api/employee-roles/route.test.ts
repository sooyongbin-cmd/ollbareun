import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadEmployeeRoles } from "@/lib/employee-roles";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GET } from "./route";

vi.mock("@/lib/employee-roles", () => ({ loadEmployeeRoles: vi.fn() }));
vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));

describe("GET /api/employee-roles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns configured roles to an authenticated manager", async () => {
    const adminClient = {};
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(adminClient as never);
    vi.mocked(loadEmployeeRoles).mockResolvedValue(["경비원", "미화원", "주차원", "사감"]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ roles: ["경비원", "미화원", "주차원", "사감"] });
    expect(loadEmployeeRoles).toHaveBeenCalledWith(adminClient);
  });

  it("denies unauthenticated access", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(loadEmployeeRoles).not.toHaveBeenCalled();
  });
});

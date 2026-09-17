import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { createWorksite } from "@/lib/phase1-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { POST } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/phase1-data", () => ({
  createWorksite: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("/api/worksites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies POST if not logged in as a manager", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/worksites", {
        method: "POST",
        body: JSON.stringify({ name: "본사", address: "서울", gpsInfo: {}, radiusMeters: "100" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(createWorksite).not.toHaveBeenCalled();
  });

  it("creates a worksite with the server-side Supabase client after manager authentication", async () => {
    const adminClient = {};
    const worksite = { id: "worksite-1", name: "본사" };
    vi.mocked(getManagerUser).mockResolvedValue({ id: "admin-user-1" } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(adminClient as never);
    vi.mocked(createWorksite).mockResolvedValue(worksite as never);

    const body = { name: "본사", address: "서울", gpsInfo: {}, radiusMeters: "100" };
    const response = await POST(
      new Request("http://localhost/api/worksites", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ worksite });
    expect(createWorksite).toHaveBeenCalledWith(body, adminClient);
  });
});

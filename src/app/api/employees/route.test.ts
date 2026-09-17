import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { createEmployee } from "@/lib/phase1-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { POST } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/phase1-data", () => ({
  createEmployee: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("/api/employees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies POST if not logged in as a manager", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/employees", {
        method: "POST",
        body: JSON.stringify({ name: "홍길동", phone: "010-0000-0000" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(createEmployee).not.toHaveBeenCalled();
  });

  it("creates an employee with the server-side Supabase client after manager authentication", async () => {
    const adminClient = {};
    const employee = { id: "employee-1", name: "홍길동", phone: "010-0000-0000", role: "경비원" };
    vi.mocked(getManagerUser).mockResolvedValue({ id: "admin-user-1" } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(adminClient as never);
    vi.mocked(createEmployee).mockResolvedValue(employee as never);

    const body = { name: "홍길동", phone: "010-0000-0000", role: "경비원" };
    const response = await POST(
      new Request("http://localhost/api/employees", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ employee });
    expect(createEmployee).toHaveBeenCalledWith(body, adminClient);
  });
});

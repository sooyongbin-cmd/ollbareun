import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUserWithRole } from "@/lib/manager-auth";
import { listAdminUsers, registerAdminUser } from "@/lib/admin-users";
import { GET, POST } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUserWithRole: vi.fn(),
}));

vi.mock("@/lib/admin-users", () => ({
  listAdminUsers: vi.fn(),
  registerAdminUser: vi.fn(),
}));

describe("/api/manager/admin-users", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("denies GET if not logged in", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "인증 정보가 올바르지 않습니다." });
  });

  it("allows GET if logged in as regular admin", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com" } as never,
      adminUser: { id: "admin-1", role: "admin", email: "admin@example.com" } as never,
    });
    vi.mocked(listAdminUsers).mockResolvedValue([
      { id: "admin-1", email: "admin@example.com", role: "admin", user_id: "user-1" } as never,
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.admins).toHaveLength(1);
  });

  it("denies POST if not logged in", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }));
    expect(response.status).toBe(401);
  });

  it("denies POST if logged in but role is admin", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com" } as never,
      adminUser: { id: "admin-1", role: "admin", email: "admin@example.com" } as never,
    });

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "admin" }),
      }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "최고 관리자 권한이 필요합니다." });
  });

  it("allows POST if role is super_admin", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({
      user: { id: "super-1", email: "super@example.com" } as never,
      adminUser: { id: "admin-super", role: "super_admin", email: "super@example.com" } as never,
    });
    vi.mocked(registerAdminUser).mockResolvedValue({
      id: "admin-new",
      email: "new@example.com",
      role: "admin",
    } as never);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "admin" }),
      }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.admin.id).toBe("admin-new");
    expect(registerAdminUser).toHaveBeenCalledWith("new@example.com", "admin", "super-1");
  });
});

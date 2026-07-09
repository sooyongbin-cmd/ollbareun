import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUserWithRole } from "@/lib/manager-auth";
import { updateAdminUserRole, deleteAdminUser } from "@/lib/admin-users";
import { PATCH, DELETE } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUserWithRole: vi.fn(),
}));

vi.mock("@/lib/admin-users", () => ({
  updateAdminUserRole: vi.fn(),
  deleteAdminUser: vi.fn(),
}));

describe("/api/manager/admin-users/[id]", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("denies PATCH if not logged in", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ role: "admin" }) }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(response.status).toBe(401);
  });

  it("denies PATCH if logged in but not super_admin", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com" } as never,
      adminUser: { id: "admin-1", role: "admin", email: "admin@example.com" } as never,
    });

    const response = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ role: "admin" }) }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(response.status).toBe(403);
  });

  it("allows PATCH if super_admin", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({
      user: { id: "super-1", email: "super@example.com" } as never,
      adminUser: { id: "admin-super", role: "super_admin", email: "super@example.com" } as never,
    });
    vi.mocked(updateAdminUserRole).mockResolvedValue({ id: "1", role: "admin" } as never);

    const response = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ role: "admin" }) }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(response.status).toBe(200);
    expect(updateAdminUserRole).toHaveBeenCalledWith("1", "admin");
  });

  it("denies DELETE if logged in but not super_admin", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com" } as never,
      adminUser: { id: "admin-1", role: "admin", email: "admin@example.com" } as never,
    });

    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(response.status).toBe(403);
  });

  it("allows DELETE if super_admin", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({
      user: { id: "super-1", email: "super@example.com" } as never,
      adminUser: { id: "admin-super", role: "super_admin", email: "super@example.com" } as never,
    });

    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(response.status).toBe(200);
    expect(deleteAdminUser).toHaveBeenCalledWith("1");
  });
});

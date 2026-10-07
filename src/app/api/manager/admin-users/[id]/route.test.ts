import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUserWithRole } from "@/lib/manager-auth";
import { updateAdminUserRole, deleteAdminUser, getAdminUser } from "@/lib/admin-users";
import { GET, PATCH, DELETE } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUserWithRole: vi.fn(),
}));

vi.mock("@/lib/admin-users", () => ({
  updateAdminUserRole: vi.fn(),
  deleteAdminUser: vi.fn(),
  getAdminUser: vi.fn(),
}));

describe("/api/manager/admin-users/[id]", () => {
  it("loads the selected admin with editing permission", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({ adminUser: { role: "super_admin" } } as never);
    vi.mocked(getAdminUser).mockResolvedValue({ id: "a", email: "a@example.com", role: "admin" } as never);
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "a" }) });
    expect(getAdminUser).toHaveBeenCalledWith("a");
    expect(await response.json()).toEqual({ admin: { id: "a", email: "a@example.com", role: "admin" }, canEdit: true });
  });
  it("saves email and role together", async () => {
    vi.mocked(getManagerUserWithRole).mockResolvedValue({ adminUser: { role: "super_admin" } } as never);
    vi.mocked(updateAdminUserRole).mockResolvedValue({ id: "a" } as never);
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ email: "new@example.com", role: "admin" }) }), { params: Promise.resolve({ id: "a" }) });
    expect(response.status).toBe(200);
    expect(updateAdminUserRole).toHaveBeenCalledWith("a", "admin", "new@example.com");
  });
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

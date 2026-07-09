import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import { listAdminUsers, registerAdminUser, updateAdminUserRole, deleteAdminUser } from "./admin-users";

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("admin-users library", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists all admin users", async () => {
    const mockData = [{ id: "1", email: "admin@example.com", role: "admin" }];
    const selectMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: () => ({
        select: () => ({
          order: selectMock,
        }),
      }),
    } as never);

    const result = await listAdminUsers();
    expect(result).toEqual(mockData);
  });

  it("registers a new admin user", async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: "2", email: "new@example.com", role: "admin" },
      error: null,
    });
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: (table: string) => {
        expect(table).toBe("admin_users");
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: maybeSingleMock,
            }),
            single: singleMock,
          }),
          insert: vi.fn().mockReturnValue({
            select: () => ({
              single: singleMock,
            }),
          }),
        };
      },
    } as never);

    const result = await registerAdminUser("new@example.com", "admin", "creator-uuid");
    expect(result).toEqual({ id: "2", email: "new@example.com", role: "admin" });
  });

  it("prevents registering duplicate admin emails", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { id: "1", email: "existing@example.com" },
      error: null,
    });

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: maybeSingleMock,
          }),
        }),
      }),
    } as never);

    await expect(registerAdminUser("existing@example.com", "admin")).rejects.toThrow(
      "이미 등록된 관리자 이메일입니다.",
    );
  });

  it("prevents demoting the last super_admin", async () => {
    // Current target is super_admin
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: "1", role: "super_admin" },
      error: null,
    });
    // Total count of super_admins is 1
    const headMock = vi.fn().mockResolvedValue({ count: 1, error: null });

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: (table: string) => {
        expect(table).toBe("admin_users");
        return {
          select: (columns?: string, options?: unknown) => {
            if (options && typeof options === "object" && "count" in options && options.count === "exact") {
              return { eq: headMock };
            }
            return { eq: () => ({ single: singleMock }) };
          },
        };
      },
    } as never);

    await expect(updateAdminUserRole("1", "admin")).rejects.toThrow(
      "시스템의 마지막 최고 관리자 권한은 변경할 수 없습니다.",
    );
  });

  it("prevents deleting the last super_admin", async () => {
    // Target is super_admin
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: "1", role: "super_admin" },
      error: null,
    });
    // Total count of super_admins is 1
    const headMock = vi.fn().mockResolvedValue({ count: 1, error: null });

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: (table: string) => {
        expect(table).toBe("admin_users");
        return {
          select: (columns?: string, options?: unknown) => {
            if (options && typeof options === "object" && "count" in options && options.count === "exact") {
              return { eq: headMock };
            }
            return { eq: () => ({ single: singleMock }) };
          },
        };
      },
    } as never);

    await expect(deleteAdminUser("1")).rejects.toThrow(
      "시스템의 마지막 최고 관리자는 삭제할 수 없습니다.",
    );
  });
});

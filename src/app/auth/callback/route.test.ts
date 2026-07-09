import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { GET } from "./route";

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

function createAdminClient(count: number) {
  const insert = vi.fn().mockReturnValue({
    select: () => ({
      single: async () => ({ data: { user_id: "user-1", role: "super_admin" }, error: null }),
    }),
  });

  return {
    insert,
    client: {
      from: (table: string) => {
        expect(table).toBe("admin_users");

        return {
          select: (_: string, options?: { count: "exact"; head: true }) => {
            if (options) {
              return Promise.resolve({ count, error: null }) as never;
            }

            return {
              eq: () => ({
                maybeSingle: async () => ({ data: { user_id: "user-1", role: "super_admin" }, error: null }),
              }),
            } as never;
          },
          insert,
        };
      },
    },
  };
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exchanges the OAuth code and redirects to the manager next path", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "admin@example.com" } }, error: null });
    const signOut = vi.fn();
    const admin = createAdminClient(1);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { exchangeCodeForSession, getUser, signOut },
    } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin.client as never);

    const response = await GET(
      new Request("http://localhost/auth/callback?code=abc&next=%2Fmanager%2Fsystem%2Flogs"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(admin.insert).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/manager/system/logs");
  });

  it("registers the authenticated callback user as super_admin when admin_users is empty after setup verification", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "owner@example.com" } }, error: null });
    const admin = createAdminClient(0);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { exchangeCodeForSession, getUser },
    } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin.client as never);

    const response = await GET(
      new Request("http://localhost/auth/callback?code=abc&next=%2Fmanager&setup=initial_admin"),
    );

    expect(admin.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      email: "owner@example.com",
      role: "super_admin",
    });
    expect(response.headers.get("location")).toBe("http://localhost/manager");
  });

  it("uses the exchanged session user for initial admin setup when the setup code was already verified", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1", email: "owner@example.com" } },
      error: null,
    });
    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("missing session") });
    const admin = createAdminClient(0);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { exchangeCodeForSession, getUser },
    } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin.client as never);

    const response = await GET(
      new Request("http://localhost/auth/callback?code=abc&next=%2Fmanager&setup=initial_admin"),
    );

    expect(admin.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      email: "owner@example.com",
      role: "super_admin",
    });
    expect(response.headers.get("location")).toBe("http://localhost/manager");
  });

  it("redirects to the manager auth screen when the callback has no code", async () => {
    const response = await GET(new Request("http://localhost/auth/callback?next=%2Fmanager"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/manager/auth?error=callback");
  });

  it("redirects to next path when user_id is already registered in admin_users", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-registered", email: "admin@example.com" } }, error: null });
    const signOut = vi.fn();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { exchangeCodeForSession, getUser, signOut },
    } as never);

    const adminClient = {
      from: (table: string) => {
        expect(table).toBe("admin_users");
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              expect(col).toBe("user_id");
              expect(val).toBe("user-registered");
              return {
                maybeSingle: async () => ({ data: { user_id: "user-registered", role: "admin" }, error: null }),
              };
            },
          }),
        };
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(adminClient as never);

    const response = await GET(
      new Request("http://localhost/auth/callback?code=abc&next=%2Fmanager%2Fdashboard"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/manager/dashboard");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("links user_id when not found by user_id but email matches a pre-registered row", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-new", email: "pre@example.com" } }, error: null });
    const signOut = vi.fn();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { exchangeCodeForSession, getUser, signOut },
    } as never);

    const updateMock = vi.fn().mockReturnValue({
      eq: () => ({
        is: () => ({
          select: () => ({
            single: async () => ({ data: { user_id: "user-new", role: "admin" }, error: null }),
          }),
        }),
      }),
    });

    const adminClient = {
      from: (table: string) => {
        expect(table).toBe("admin_users");
        return {
          select: () => {
            return {
              eq: (col: string, val: string) => {
                if (col === "user_id") {
                  return {
                    maybeSingle: async () => ({ data: null, error: null }),
                  };
                }
                expect(col).toBe("email");
                expect(val).toBe("pre@example.com");
                return {
                  maybeSingle: async () => ({ data: { user_id: null, role: "admin" }, error: null }),
                };
              },
            };
          },
          update: updateMock,
        };
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(adminClient as never);

    const response = await GET(
      new Request("http://localhost/auth/callback?code=abc&next=%2Fmanager%2Fdashboard"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/manager/dashboard");
    expect(updateMock).toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs out and redirects to unauthorized when email is not pre-registered", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-unauth", email: "unauth@example.com" } }, error: null });
    const signOut = vi.fn();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { exchangeCodeForSession, getUser, signOut },
    } as never);

    const adminClient = {
      from: (table: string) => {
        expect(table).toBe("admin_users");
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(adminClient as never);

    const response = await GET(
      new Request("http://localhost/auth/callback?code=abc&next=%2Fmanager%2Fdashboard"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/manager/auth?error=unauthorized");
    expect(signOut).toHaveBeenCalled();
  });
});

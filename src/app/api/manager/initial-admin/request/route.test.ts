import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSystemConfigContent } from "@/lib/system-configs";
import { POST } from "./route";

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/system-configs", () => ({
  getSystemConfigContent: vi.fn(),
}));

function createAdminClient({ count = 0 }: { count?: number } = {}) {
  return {
    from: (table: string) => {
      expect(table).toBe("admin_users");

      return {
        select: async (_columns: string, options: { count: "exact"; head: true }) => {
          expect(options).toEqual({ count: "exact", head: true });

          return { count, error: null };
        },
      };
    },
  };
}

describe("initial admin request route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(getSystemConfigContent).mockResolvedValue("setup-code");
  });

  it("returns a verified Google OAuth URL when the setup code matches", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/v2/auth" },
      error: null,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(createAdminClient() as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signInWithOAuth },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/manager/initial-admin/request", {
        method: "POST",
        body: JSON.stringify({
          setupCode: " setup-code ",
          nextPath: "/manager/system/logs",
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ url: "https://accounts.google.com/o/oauth2/v2/auth" });
    expect(response.status).toBe(200);
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost/auth/callback?next=%2Fmanager%2Fsystem%2Flogs&setup=initial_admin",
      },
    });
  });

  it("rejects an incorrect setup code without creating a Google OAuth URL", async () => {
    const signInWithOAuth = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue(createAdminClient() as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signInWithOAuth },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/manager/initial-admin/request", {
        method: "POST",
        body: JSON.stringify({
          setupCode: "wrong-code",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });
});

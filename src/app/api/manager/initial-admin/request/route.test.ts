import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSystemConfigContent } from "@/lib/system-configs";
import { POST } from "./route";

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/system-configs", () => ({
  getSystemConfigContent: vi.fn(),
}));

function createAdminClient({ count = 0, signInError = null }: { count?: number; signInError?: Error | null } = {}) {
  const signInWithOtp = vi.fn().mockResolvedValue({ data: {}, error: signInError });

  return {
    signInWithOtp,
    client: {
      auth: { signInWithOtp },
      from: (table: string) => {
        expect(table).toBe("admin_users");

        return {
          select: async (_columns: string, options: { count: "exact"; head: true }) => {
            expect(options).toEqual({ count: "exact", head: true });

            return { count, error: null };
          },
        };
      },
    },
  };
}

describe("initial admin request route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(getSystemConfigContent).mockResolvedValue("setup-code");
  });

  it("sends an OTP that can create the first admin auth user when the setup code matches", async () => {
    const admin = createAdminClient();
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin.client as never);

    const response = await POST(
      new Request("http://localhost/api/manager/initial-admin/request", {
        method: "POST",
        body: JSON.stringify({
          email: " owner@example.com ",
          setupCode: " setup-code ",
          nextPath: "/manager/system/logs",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(admin.signInWithOtp).toHaveBeenCalledWith({
      email: "owner@example.com",
      options: {
        emailRedirectTo: "http://localhost/auth/callback?next=%2Fmanager%2Fsystem%2Flogs&setup=initial_admin",
        shouldCreateUser: true,
      },
    });
  });

  it("rejects an incorrect setup code without sending an OTP", async () => {
    const admin = createAdminClient();
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin.client as never);

    const response = await POST(
      new Request("http://localhost/api/manager/initial-admin/request", {
        method: "POST",
        body: JSON.stringify({
          email: "owner@example.com",
          setupCode: "wrong-code",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(admin.signInWithOtp).not.toHaveBeenCalled();
  });
});

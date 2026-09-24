import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  GuardAuthenticationError,
  GuardAuthorizationError,
  createGuardAuthSession,
  requireGuardEmployee,
  revokeGuardAuthSession,
} from "./guard-auth-session";

vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));

describe("server guard sessions", () => {
  const insert = vi.fn();
  const update = vi.fn();
  const select = vi.fn();
  const eq = vi.fn();
  const is = vi.fn();
  const gt = vi.fn();
  const maybeSingle = vi.fn();
  const or = vi.fn();
  const from = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    from.mockImplementation((table: string) => ({
      insert,
      delete: () => ({ or }),
      select: (fields: string) => {
        select(fields);
        return { eq: (...args: unknown[]) => {
          eq(...args);
          if (table === "employees") return { maybeSingle };
          return { is: (...isArgs: unknown[]) => {
            is(...isArgs);
            return { gt: (...gtArgs: unknown[]) => { gt(...gtArgs); return { maybeSingle }; } };
          } };
        } };
      },
      update: (payload: unknown) => { update(payload); return { eq: (...args: unknown[]) => { eq(...args); return { is }; } }; },
      table,
    }));
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    or.mockResolvedValue({ error: null });
    insert.mockResolvedValue({ error: null });
    is.mockResolvedValue({ error: null });
  });

  it("stores only a token hash and returns a secure HttpOnly cookie", async () => {
    const result = await createGuardAuthSession("employee-1");

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      employee_id: "employee-1",
      token_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      expires_at: expect.any(String),
    }));
    expect(result.setCookie).toContain("HttpOnly");
    expect(result.setCookie).toContain("SameSite=Lax");
    expect(result.setCookie).toContain(result.token);
    expect(insert.mock.calls[0]?.[0].token_hash).not.toBe(result.token);
  });

  it("rejects missing and mismatched identities", async () => {
    await expect(requireGuardEmployee(new Request("https://example.test/api"))).rejects.toBeInstanceOf(GuardAuthenticationError);
    maybeSingle.mockResolvedValueOnce({ data: { employee_id: "employee-1" }, error: null });
    await expect(requireGuardEmployee(
      new Request("https://example.test/api", { headers: { Cookie: "ollbareun_guard_session=token" } }),
      "employee-2",
    )).rejects.toBeInstanceOf(GuardAuthorizationError);
  });

  it("binds a valid cookie to its active employee", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { employee_id: "employee-1" }, error: null })
      .mockResolvedValueOnce({ data: { id: "employee-1", name: "홍길동", role: "경비원", is_retired: false }, error: null });

    await expect(requireGuardEmployee(
      new Request("https://example.test/api", { headers: { Cookie: "ollbareun_guard_session=token" } }),
      "employee-1",
    )).resolves.toMatchObject({ id: "employee-1", role: "경비원" });
    expect(eq).toHaveBeenCalledWith("token_hash", expect.stringMatching(/^[0-9a-f]{64}$/));
  });

  it("revokes the cookie session without returning or storing the raw token", async () => {
    const request = new Request("https://example.test/api", { headers: { Cookie: "ollbareun_guard_session=token" } });
    await revokeGuardAuthSession(request);
    expect(update).toHaveBeenCalledWith({ revoked_at: expect.any(String) });
    expect(eq).toHaveBeenCalledWith("token_hash", expect.stringMatching(/^[0-9a-f]{64}$/));
  });
});

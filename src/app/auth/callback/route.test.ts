import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { GET } from "./route";

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe("auth callback route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exchanges the OAuth code and redirects to the manager next path", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { exchangeCodeForSession },
    } as never);

    const response = await GET(
      new Request("http://localhost/auth/callback?code=abc&next=%2Fmanager%2Fsystem%2Flogs"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/manager/system/logs");
  });

  it("redirects to the manager auth screen when the callback has no code", async () => {
    const response = await GET(new Request("http://localhost/auth/callback?next=%2Fmanager"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/manager/auth?error=callback");
  });
});

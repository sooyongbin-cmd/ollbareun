import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import ManagerEmailLogin from "./manager-email-login";

vi.mock("@/lib/supabase-browser", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

describe("manager google login", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost/manager/auth?next=%2Fmanager%2Fsystem%2Flogs"),
      writable: true,
    });
  });

  it("starts Supabase Google OAuth with a manager callback URL", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.mocked(createSupabaseBrowserClient).mockReturnValue({
      auth: { signInWithOAuth },
    } as never);

    render(<ManagerEmailLogin initialAdminSetupRequired={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Google로 관리자 로그인" }));

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost/auth/callback?next=%2Fmanager%2Fsystem%2Flogs",
      },
    });
    expect(window.sessionStorage.getItem("ollbareun.manager.browserSession")).toBe("active");
  });

  it("requests a verified initial admin Google OAuth URL with the setup code", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: {
        origin: "http://localhost",
        search: "?next=%2Fmanager%2Fsystem%2Flogs",
        assign,
      },
      writable: true,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://accounts.google.com/o/oauth2/v2/auth" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ManagerEmailLogin initialAdminSetupRequired />);

    await userEvent.type(screen.getByLabelText("최초 관리자 등록코드"), "setup-code");
    await userEvent.click(screen.getByRole("button", { name: "Google로 최초 관리자 등록" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/manager/initial-admin/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setupCode: "setup-code",
        nextPath: "/manager/system/logs",
      }),
    });
    expect(window.sessionStorage.getItem("ollbareun.manager.browserSession")).toBe("active");
    expect(assign).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth");
  });
});

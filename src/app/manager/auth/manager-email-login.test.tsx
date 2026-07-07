import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import ManagerEmailLogin from "./manager-email-login";

vi.mock("@/lib/supabase-browser", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

describe("manager email login", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost/manager/auth?next=%2Fmanager%2Fsystem%2Flogs"),
      writable: true,
    });
  });

  it("starts Supabase email authentication with a manager callback URL", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.mocked(createSupabaseBrowserClient).mockReturnValue({
      auth: { signInWithOtp },
    } as never);

    render(<ManagerEmailLogin initialAdminSetupRequired={false} />);

    await userEvent.type(screen.getByLabelText("관리자 이메일"), "admin@example.com");
    await userEvent.click(screen.getByRole("button", { name: "인증 메일 받기" }));

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "admin@example.com",
      options: {
        emailRedirectTo: "http://localhost/auth/callback?next=%2Fmanager%2Fsystem%2Flogs",
        shouldCreateUser: false,
      },
    });
    expect(await screen.findByText("인증 메일을 보냈습니다. 메일의 링크를 눌러 관리자 화면으로 돌아오세요.")).toBeInTheDocument();
  });

  it("requests an initial admin magic link with the setup code", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ManagerEmailLogin initialAdminSetupRequired />);

    await userEvent.type(screen.getByLabelText("관리자 이메일"), "owner@example.com");
    await userEvent.type(screen.getByLabelText("최초 관리자 등록코드"), "setup-code");
    await userEvent.click(screen.getByRole("button", { name: "최초 관리자 인증 메일 받기" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/manager/initial-admin/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        setupCode: "setup-code",
        nextPath: "/manager/system/logs",
      }),
    });
    expect(await screen.findByText("인증 메일을 보냈습니다. 메일 인증 후 최초 관리자로 등록됩니다.")).toBeInTheDocument();
  });
});

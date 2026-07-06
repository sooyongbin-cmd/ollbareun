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

    render(<ManagerEmailLogin />);

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
});

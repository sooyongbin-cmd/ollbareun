import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import ManagerKakaoLogin from "./manager-kakao-login";

vi.mock("@/lib/supabase-browser", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

describe("manager Kakao login", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost/manager/auth?next=%2Fmanager%2Fsystem%2Flogs"),
      writable: true,
    });
  });

  it("starts Supabase Kakao OAuth with a manager callback URL", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.mocked(createSupabaseBrowserClient).mockReturnValue({
      auth: { signInWithOAuth },
    } as never);

    render(<ManagerKakaoLogin />);
    await userEvent.click(screen.getByRole("button", { name: "카카오로 관리자 인증" }));

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "kakao",
      options: {
        redirectTo: "http://localhost/auth/callback?next=%2Fmanager%2Fsystem%2Flogs",
      },
    });
  });
});

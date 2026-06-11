import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardPage from "./page";

const push = vi.fn();
const replace = vi.fn();
const signInWithPasskey = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock("@/lib/supabase-passkey-client", () => ({
  getSupabasePasskeyClient: () => ({
    auth: { signInWithPasskey },
  }),
}));

describe("guard login page", () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    signInWithPasskey.mockReset();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      value: {
        origin: "http://localhost:3000",
        href: "http://localhost:3000/guard",
        pathname: "/guard",
      },
      writable: true,
      configurable: true,
    });
  });

  function setUserAgent(ua: string) {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  }

  function setStandaloneMode(matches: boolean) {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(display-mode: standalone)" ? matches : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  it("labels the guard authentication submit button as login in standalone mode", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1");
    setStandaloneMode(true);
    render(<GuardPage />);

    expect(await screen.findByRole("button", { name: "로그인" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "경비원 인증" })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "처리 내역 없음" })).toBeInTheDocument();
  });

  it("places the passkey login section below the guard login section", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1");
    setStandaloneMode(true);
    render(<GuardPage />);

    const loginSection = await screen.findByRole("region", { name: "근무자 로그인" });
    const passkeyButton = await screen.findByRole("button", { name: "패스키로 로그인" });
    const passkeySection = passkeyButton.closest("section");

    expect(loginSection).toContainElement(screen.getByLabelText("이름"));
    expect(loginSection).toContainElement(screen.getByLabelText("연락처"));
    expect(loginSection).toContainElement(screen.getByRole("button", { name: "로그인" }));
    expect(passkeySection).not.toBeNull();
    expect(Boolean(loginSection.compareDocumentPosition(passkeySection!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it("redirects to guard main when an active guard session exists", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1");
    setStandaloneMode(true);
    window.sessionStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({
        employee: { id: "employee-1", name: "홍길동" },
      }),
    );

    render(<GuardPage />);

    expect(replace).toHaveBeenCalledWith("/guard/main");
  });

  it("shows guard login progress below the login button while authentication is running", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1");
    setStandaloneMode(true);
    let resolveAuth!: (response: Response) => void;
    const authPromise = new Promise<Response>((resolve) => {
      resolveAuth = resolve;
    });
    vi.stubGlobal("fetch", vi.fn(() => authPromise));

    render(<GuardPage />);

    fireEvent.change(await screen.findByLabelText("이름"), { target: { value: "홍길동" } });
    fireEvent.change(screen.getByLabelText("연락처"), { target: { value: "010-0000-0000" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByText("로그인 요청을 전송하고 있습니다.")).toBeInTheDocument();
    expect(screen.getByText("로그인진행중....")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeDisabled();

    resolveAuth(
      Response.json({
        employee: { id: "emp-1", name: "홍길동" },
        assignment: null,
        worksite: null,
        attendance: null,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("메인 화면으로 이동합니다.")).toBeInTheDocument();
    });
    expect(push).toHaveBeenCalledWith("/guard/main");
  });

  it("stores a guard session after passkey login succeeds", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1");
    setStandaloneMode(true);
    signInWithPasskey.mockResolvedValue({
      data: { session: { access_token: "token-1" } },
      error: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          employee: { id: "emp-1", name: "홍길동" },
          assignment: null,
          worksite: null,
          attendance: null,
        }),
      ),
    );

    render(<GuardPage />);
    fireEvent.click(await screen.findByRole("button", { name: "패스키로 로그인" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/guard/main");
    });
    expect(fetch).toHaveBeenCalledWith("/api/guard/passkeys/session", {
      method: "POST",
      headers: { Authorization: "Bearer token-1" },
    });
    expect(window.sessionStorage.getItem("ollbareun.guard.session")).toContain("emp-1");
  });

  it("shows login pending modal during passkey login", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1");
    setStandaloneMode(true);
    signInWithPasskey.mockResolvedValue({
      data: { session: { access_token: "token-1" } },
      error: null,
    });

    let resolveSession!: (response: Response) => void;
    const sessionPromise = new Promise<Response>((resolve) => {
      resolveSession = resolve;
    });
    vi.stubGlobal("fetch", vi.fn(() => sessionPromise));

    render(<GuardPage />);
    fireEvent.click(await screen.findByRole("button", { name: "패스키로 로그인" }));

    expect(await screen.findByText("로그인진행중....")).toBeInTheDocument();

    resolveSession(
      Response.json({
        employee: { id: "emp-1", name: "홍길동" },
        assignment: null,
        worksite: null,
        attendance: null,
      }),
    );

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/guard/main");
    });
  });

  it("shows the last logout push cleanup result", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1");
    setStandaloneMode(true);
    window.sessionStorage.setItem(
      "ollbareun.guard.logout.pushResult",
      JSON.stringify({
        completedAt: "2026-06-02T09:00:00.000Z",
        employeeId: "employee-1",
        endpoint: "https://push.example.test/subscription-1",
        browserSubscription: "removed",
        serverSubscription: "removed",
        session: "removed",
      }),
    );

    render(<GuardPage />);

    expect(await screen.findByRole("heading", { name: "마지막 로그아웃 처리 내역" })).toBeInTheDocument();
    expect(await screen.findByText("브라우저 Push 구독 해제 완료")).toBeInTheDocument();
    expect(await screen.findByText("Supabase 구독정보 삭제 완료")).toBeInTheDocument();
    expect(await screen.findByText("로그인 세션 삭제 완료")).toBeInTheDocument();
  });

  it("shows when there was no server push subscription to delete", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1");
    setStandaloneMode(true);
    window.sessionStorage.setItem(
      "ollbareun.guard.logout.pushResult",
      JSON.stringify({
        completedAt: "2026-06-02T09:00:00.000Z",
        employeeId: "employee-1",
        endpoint: null,
        browserSubscription: "not-found",
        serverSubscription: "not-found",
        session: "removed",
      }),
    );

    render(<GuardPage />);

    expect(await screen.findByText("삭제할 Supabase 구독정보 없음")).toBeInTheDocument();
  });

  it("shows an inline default browser guide in in-app browsers", async () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.0.0 Mobile Safari/537.36 KAKAOTALK/9.8.5");
    setStandaloneMode(false);
    window.sessionStorage.setItem(
      "ollbareun.guard.logout.pushResult",
      JSON.stringify({
        completedAt: "2026-06-02T09:00:00.000Z",
        employeeId: "employee-1",
        endpoint: "https://push.example.test/subscription-1",
        browserSubscription: "removed",
        serverSubscription: "removed",
        session: "removed",
      }),
    );

    render(<GuardPage />);

    await waitFor(() => {
      expect(screen.queryByLabelText("이름")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("연락처")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "로그인" })).not.toBeInTheDocument();
      expect(screen.queryByText("로그아웃 Push 처리 결과")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "기본 브라우저로 열기 안내" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "기본 브라우저로 열기" })).toBeInTheDocument();
  });

  it("opens the default browser from the inline guide on Android", async () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.0.0 Mobile Safari/537.36 KAKAOTALK/9.8.5");
    setStandaloneMode(false);

    render(<GuardPage />);

    const actionButton = await screen.findByRole("button", { name: "기본 브라우저로 열기" });
    fireEvent.click(actionButton);

    expect(window.location.href).toBe("intent://localhost:3000/guard#Intent;scheme=https;end");
  });

  it("shows an install section in an installable browser", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = Promise.resolve({ outcome: "accepted" });
    installEvent.preventDefault = vi.fn();
    setUserAgent("Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 Chrome/110.0 Mobile Safari/537.36");
    setStandaloneMode(false);

    render(<GuardPage />);
    window.dispatchEvent(installEvent);

    expect(await screen.findByRole("heading", { name: "홈화면 아이콘 설치" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "로그인" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "홈화면 아이콘 설치" }));

    expect(installEvent.preventDefault).toHaveBeenCalled();
    expect(prompt).toHaveBeenCalled();
  });

  it("shows a home screen launch guide when a regular browser has no install prompt", async () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 Chrome/110.0 Mobile Safari/537.36");
    setStandaloneMode(false);

    render(<GuardPage />);

    expect(await screen.findByRole("heading", { name: "홈화면 아이콘에서 실행해 주세요" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "로그인" })).not.toBeInTheDocument();
    expect(screen.queryByText("로그아웃 Push 처리 결과")).not.toBeInTheDocument();
  });
});

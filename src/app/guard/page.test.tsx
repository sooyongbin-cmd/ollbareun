import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardPage from "./page";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

describe("guard login page", () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    window.sessionStorage.clear();
  });

  it("labels the guard authentication submit button as login", () => {
    render(<GuardPage />);

    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "경비원 인증" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "처리 내역 없음" })).toBeInTheDocument();
  });

  it("redirects to guard main when an active guard session exists", () => {
    window.sessionStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({
        employee: { id: "employee-1", name: "홍길동" },
      }),
    );

    render(<GuardPage />);

    expect(replace).toHaveBeenCalledWith("/guard/main");
  });

  it("shows the last logout push cleanup result", () => {
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

    expect(screen.getByRole("heading", { name: "마지막 로그아웃 처리 내역" })).toBeInTheDocument();
    expect(screen.getByText("브라우저 Push 구독 해제 완료")).toBeInTheDocument();
    expect(screen.getByText("Supabase 구독정보 삭제 완료")).toBeInTheDocument();
    expect(screen.getByText("로그인 세션 삭제 완료")).toBeInTheDocument();
  });
});

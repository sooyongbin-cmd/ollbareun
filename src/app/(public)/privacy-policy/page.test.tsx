import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PrivacyPolicyPage from "./page";

vi.mock("../../homepage-footer", () => ({ default: () => null }));

describe("worker privacy policy", () => {
  it("publishes the owner-confirmed date, contact and account administration", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "개인정보처리방침" })).toBeInTheDocument();
    expect(container.querySelector('time[datetime="2026-09-24"]')).toHaveTextContent("2026년 9월 24일");
    expect(screen.getByText("성명: 빈수용")).toBeInTheDocument();
    for (const contact of screen.getAllByRole("link", { name: "cyberbin@naver.com" })) {
      expect(contact).toHaveAttribute("href", "mailto:cyberbin@naver.com");
    }
    expect(screen.getByText(/근무자 계정의 등록과 삭제는 관리자가/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "근무자 앱으로 돌아가기" })).toHaveAttribute("href", "/guard");
  });

  it("distinguishes work retention from operational logs and subscriptions", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(screen.getByText(/퇴사일부터 5년간 보관한 후 폐기/)).toBeInTheDocument();
    expect(screen.getByText(/최근 100건을 유지/)).toBeInTheDocument();
    expect(screen.getByText(/로그아웃 또는 구독 해제 시 삭제/)).toBeInTheDocument();
    expect(container).not.toHaveTextContent("3개월 또는 1년");
    expect(container).not.toHaveTextContent("2026년 12월 01일");
  });

  it("discloses the report data and production email service without claiming unused providers", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(screen.getByText(/보고 메일 전송에는 Naver 메일을 사용/)).toBeInTheDocument();
    expect(screen.getByText(/위치 정보:.*위도·경도/)).toBeInTheDocument();
    expect(screen.getByText(/음성이 해당 서비스의 서버로 전송될 수/)).toBeInTheDocument();
    expect(container).not.toHaveTextContent("Resend");
    expect(container).not.toHaveTextContent("Formspree");
  });
});

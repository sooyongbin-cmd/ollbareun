import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GuardPrivacyLinks from "./guard-privacy-links";

describe("guard privacy links", () => {
  it("opens the public policy in the same browsing context without requiring authentication", () => {
    render(<GuardPrivacyLinks />);
    const link = screen.getByRole("link", { name: "개인정보처리방침" });
    expect(link).toHaveAttribute("href", "/privacy-policy");
    expect(link).not.toHaveAttribute("target");
    expect(screen.getByRole("navigation", { name: "개인정보 및 지원" })).toBeInTheDocument();
  });

  it("offers a deletion request contact without exposing credentials or sending a request", () => {
    render(<GuardPrivacyLinks />);
    expect(screen.getByRole("link", { name: "개인정보·계정 삭제 문의" }))
      .toHaveAttribute("href", "mailto:cyberbin@naver.com");
  });
});

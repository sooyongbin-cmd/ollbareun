import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GuardMainPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("guard main shortcuts", () => {
  it("uses the same destinations as the footer inspection links", () => {
    window.localStorage.clear();
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify({
      employee: { id: "test-guard", role: "경비원" },
    }));
    render(<GuardMainPage />);

    expect(screen.getByRole("link", { name: "순찰" })).toHaveAttribute(
      "href",
      "/guard/main/work",
    );
    expect(screen.getByRole("link", { name: "특이사항 보고" })).toHaveAttribute(
      "href",
      "/guard/main/special-remarks",
    );
    expect(screen.queryByRole("heading", { name: "안전교육 상황" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "휴가 신청" })).toHaveAttribute("href", "/guard/main/leave");
    expect(within(screen.getByRole("region", { name: "근무자 바로가기" })).getByRole("link", { name: "안전교육" })).toHaveAttribute(
      "href",
      "/guard/main/safety",
    );
  });
});

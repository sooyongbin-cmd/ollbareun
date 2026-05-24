import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GuardPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("guard login page", () => {
  it("labels the guard authentication submit button as login", () => {
    render(<GuardPage />);

    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "경비원 인증" })).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MainPage } from "./homepage-pages";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("homepage back to top button", () => {
  it("links to the top anchor", () => {
    render(<MainPage />);

    const toTopButton = screen.getByRole("link", { name: "맨 위로 이동" });
    expect(toTopButton).toHaveAttribute("href", "#top");
  });
});

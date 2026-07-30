import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MainPage } from "./homepage-pages";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("homepage back to top button", () => {
  it("scrolls smoothly to top when back to top button is clicked", () => {
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(<MainPage />);

    const toTopButton = screen.getByRole("link", { name: "맨 위로 이동" });
    expect(toTopButton).toBeInTheDocument();

    fireEvent.click(toTopButton);

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });
});

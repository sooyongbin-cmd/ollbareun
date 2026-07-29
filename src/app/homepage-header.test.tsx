import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomepageHeader from "./homepage-header";

describe("homepage header", () => {
  it("opens the desktop mega menu and exposes section links", () => {
    render(<HomepageHeader />);

    const aboutMenu = screen.getAllByRole("link", { name: "올바름 소개" })[0];
    fireEvent.mouseEnter(aboutMenu);

    expect(aboutMenu).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "연혁" })).toHaveAttribute("href", "#history");
    expect(screen.getByRole("link", { name: "핵심가치" })).toHaveAttribute("href", "#values");
  });

  it("toggles the mobile navigation with an accessible button", () => {
    render(<HomepageHeader />);

    const menuButton = screen.getByRole("button", { name: "메뉴 열기" });
    fireEvent.click(menuButton);

    expect(screen.getByRole("button", { name: "메뉴 닫기" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("navigation", { name: "모바일 주요 메뉴" })).toHaveAttribute(
      "aria-hidden",
      "false",
    );
  });
});

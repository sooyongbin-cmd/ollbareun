import { fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import HomepageHeader from "./homepage-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("homepage header", () => {
  it("renders the supplied white brand logo", () => {
    const { container } = render(<HomepageHeader />);

    expect(
      container.querySelector('img[src*="archive/logo-white.svg"]'),
    ).toBeInTheDocument();
  });

  it("uses the PDF logo width on desktop", () => {
    const stylesheet = readFileSync("src/app/page.module.css", "utf8");

    expect(stylesheet).toMatch(
      /\.brandLogo\s*\{[^}]*width: 13.9375rem;/s,
    );
  });

  it("matches the Figma 22.5rem closed mobile header geometry", () => {
    const stylesheet = readFileSync("src/app/page.module.css", "utf8");

    expect(stylesheet).toContain("width: 8.304375rem;");
    expect(stylesheet).toContain("margin-left: -1.093125rem;");
    expect(stylesheet).toContain("left: 6.851875rem;");
    expect(stylesheet).toContain("font-size: 0.57375rem;");
    expect(stylesheet).toContain("letter-spacing: -0.017212rem;");
    expect(stylesheet).toContain("width: 2.451562rem;");
    expect(stylesheet).toContain("height: 1.46375rem;");
    expect(stylesheet).toContain("margin-right: -0.835rem;");
  });

  it("matches the Figma mobile menu symbol alignment and label spacing", () => {
    const stylesheet = readFileSync("src/app/page.module.css", "utf8");

    expect(stylesheet).toMatch(
      /\.mobileMenuTitle\s*\{[^}]*position: relative;[^}]*display: block;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.mobileMenuTitle > span:first-child\s*\{[^}]*top: 0;[^}]*left: 7\.24%;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.mobileMenuTitle > span:last-child\s*\{[^}]*top: 0.65625rem;[^}]*left: 13\.36%;/s,
    );
  });

  it("keeps the closed mobile menu icon horizontally stretchable", () => {
    render(<HomepageHeader />);

    expect(screen.getByRole("button", { name: "메뉴 열기" }).querySelector("svg")).toHaveAttribute(
      "preserveAspectRatio",
      "none",
    );
  });

  it("opens the desktop mega menu and exposes section links", () => {
    render(<HomepageHeader />);

    const aboutMenu = screen.getAllByRole("link", { name: "올바름 소개" })[0];
    fireEvent.mouseEnter(aboutMenu);

    expect(aboutMenu).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link", { name: "연혁" })[0]).toHaveAttribute(
      "href",
      "/about#history",
    );
    expect(screen.getAllByRole("link", { name: "핵심가치" })[0]).toHaveAttribute(
      "href",
      "/about#values",
    );
  });

  it("toggles the mobile navigation with an accessible button", () => {
    render(<HomepageHeader />);

    const menuButton = screen.getByRole("button", { name: "메뉴 열기" });
    fireEvent.click(menuButton);

    expect(screen.getByRole("button", { name: "메뉴 닫기" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("navigation", { name: "모바일 주요 메뉴" })).not.toHaveAttribute(
      "inert",
    );
  });

  it("uses accordion mobile menus and closes after a submenu navigation", () => {
    const { container } = render(<HomepageHeader />);
    const mobileNavigation = screen.getByRole("navigation", {
      name: "모바일 주요 메뉴",
    });

    fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    expect(container.querySelector('img[src*="archive/logo-color.svg"]')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    const aboutButton = within(mobileNavigation).getByRole("button", {
      name: "올바름 소개",
    });
    const servicesButton = within(mobileNavigation).getByRole("button", {
      name: "서비스",
    });
    const clientsButton = within(mobileNavigation).getByRole("button", {
      name: "고객사",
    });

    expect(aboutButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(aboutButton);
    expect(aboutButton).toHaveAttribute("aria-expanded", "true");
    expect(
      within(mobileNavigation).getByRole("link", { name: "연혁" }),
    ).toHaveAttribute("href", "/about#history");

    fireEvent.click(servicesButton);
    expect(aboutButton).toHaveAttribute("aria-expanded", "false");
    expect(servicesButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(clientsButton);
    expect(servicesButton).toHaveAttribute("aria-expanded", "false");
    expect(clientsButton).toHaveAttribute("aria-expanded", "true");
    expect(within(mobileNavigation).getByRole("link", { name: "공공기관" })).toHaveAttribute(
      "href",
      "/clients#client-list",
    );
    expect(within(mobileNavigation).getByRole("link", { name: "항공사" })).toBeInTheDocument();
    expect(within(mobileNavigation).getByRole("link", { name: "교육기관" })).toBeInTheDocument();

    fireEvent.click(within(mobileNavigation).getByRole("link", { name: "공공기관" }));
    expect(screen.getByRole("button", { name: "메뉴 열기" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the mobile navigation with Escape", () => {
    render(<HomepageHeader />);

    fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("button", { name: "메뉴 열기" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

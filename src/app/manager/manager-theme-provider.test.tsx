import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ManagerThemeProvider, {
  notifyManagerThemeChange,
} from "./manager-theme-provider";

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();

  vi.spyOn(window, "matchMedia").mockImplementation(
    () =>
      ({
        get matches() {
          return matches;
        },
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: (_event: string, listener: () => void) =>
          listeners.add(listener),
        removeEventListener: (_event: string, listener: () => void) =>
          listeners.delete(listener),
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      listeners.forEach((listener) => listener());
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.managerTheme;
  document.documentElement.style.removeProperty("color-scheme");
});

describe("ManagerThemeProvider", () => {
  it("applies dark only while the manager provider is mounted", () => {
    mockMatchMedia(false);
    const { unmount } = render(
      <ManagerThemeProvider initialTheme="dark">
        <main>관리자</main>
      </ManagerThemeProvider>,
    );

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.dataset.managerTheme).toBe("dark");

    unmount();

    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement.dataset.managerTheme).toBeUndefined();
  });

  it("follows operating system theme changes in system mode", () => {
    const mediaQuery = mockMatchMedia(false);
    render(
      <ManagerThemeProvider initialTheme="system">
        <main>관리자</main>
      </ManagerThemeProvider>,
    );

    expect(document.documentElement).not.toHaveClass("dark");

    act(() => mediaQuery.setMatches(true));

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("applies a saved THEME_CODE value immediately", () => {
    mockMatchMedia(false);
    render(
      <ManagerThemeProvider initialTheme="light">
        <main>관리자</main>
      </ManagerThemeProvider>,
    );

    act(() => notifyManagerThemeChange("dark"));

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByText("관리자").parentElement).toHaveAttribute(
      "data-theme",
      "dark",
    );
  });
});

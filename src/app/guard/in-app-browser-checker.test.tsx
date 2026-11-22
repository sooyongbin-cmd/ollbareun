import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InAppBrowserChecker from "./in-app-browser-checker";

const currentUrl = "https://www.olbareum.com/guard/main/safety?tab=daily#details";

describe("guard Chrome notice", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { href: currentUrl, protocol: "https:" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    "Android Chrome/157.0",
    "Android Chrome/157.0 SamsungBrowser/30.0",
    "Windows Chrome/157.0 Edg/157.0",
    "Android Chrome/157.0 EdgA/157.0",
    "iPhone EdgiOS/157.0 Safari/604.1",
  ])("hides the notice in supported install browsers (%s)", (userAgent) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    render(<InAppBrowserChecker />);
    expect(screen.queryByText("크롬브라우져에서 실행해주세요.")).not.toBeInTheDocument();
  });

  it.each([
    ["Android Chrome/157.0 OPR/80.0", "intent://www.olbareum.com/guard/main/safety?tab=daily#details#Intent;scheme=https;package=com.android.chrome;end"],
    ["iPhone Version/17.6 Safari/604.1", "googlechromes://www.olbareum.com/guard/main/safety?tab=daily#details"],
  ])("opens the current guard address in Chrome from %s", (userAgent, target) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    render(<InAppBrowserChecker />);
    expect(screen.getByText("크롬브라우져에서 실행해주세요.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Chrome에서 열기" }));
    expect(window.location.href).toBe(target);
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManagerInAppBrowserChecker from "./manager-in-app-browser-checker";

describe("ManagerInAppBrowserChecker", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "http://localhost:3000",
        href: "http://localhost:3000/manager",
        pathname: "/manager",
        search: "",
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  function setUserAgent(ua: string) {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  }

  it("renders null by default for regular browsers", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1");
    const { container } = render(<ManagerInAppBrowserChecker />);
    expect(container.firstChild).toBeNull();
  });

  it("renders popup on the manager pages when inside KakaoTalk on Android and handles button click", async () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.0.0 Mobile Safari/537.36 KAKAOTALK/9.8.5");
    render(<ManagerInAppBrowserChecker />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("기본 브라우저로 열기 안내")).toBeInTheDocument();
    expect(screen.getByText("관리자 화면은 기본 브라우저 또는 홈 화면 아이콘에서 사용해 주세요.")).toBeInTheDocument();

    const actionButton = screen.getByRole("button", { name: "기본 브라우저로 열기" });
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(window.location.href).toBe("intent://localhost:3000/manager#Intent;scheme=https;end");
  });

  it("renders iOS KakaoTalk guide and redirects using kakaotalk scheme on button click", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 KAKAOTALK/9.8.5");
    render(<ManagerInAppBrowserChecker />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    const actionButton = screen.getByRole("button", { name: "기본 브라우저로 열기" });
    fireEvent.click(actionButton);

    expect(window.location.href).toBe("kakaotalk://web/openExternal?url=http%3A%2F%2Flocalhost%3A3000%2Fmanager");
  });

  it("dismisses the guide when the close button is clicked", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 NAVER/12.2.0");
    const { container } = render(<ManagerInAppBrowserChecker />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    const closeButton = screen.getByLabelText("알림 닫기");
    fireEvent.click(closeButton);

    expect(container.firstChild).toBeNull();
  });
});

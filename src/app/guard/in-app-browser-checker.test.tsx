import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import InAppBrowserChecker from "./in-app-browser-checker";

describe("InAppBrowserChecker", () => {
  function setUserAgent(ua: string) {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders null by default for regular browsers", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1");
    const { container } = render(<InAppBrowserChecker />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Android specific guide when inside KakaoTalk on Android", async () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.0.0 Mobile Safari/537.36 KAKAOTALK/9.8.5");
    render(<InAppBrowserChecker />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("기본 브라우저로 열기 안내")).toBeInTheDocument();
    expect(screen.getByText(/우측 상단의/)).toBeInTheDocument();
    expect(screen.getByText(/'다른 브라우저로 열기'/)).toBeInTheDocument();
    expect(screen.getByText(/'Chrome으로 열기'/)).toBeInTheDocument();
  });

  it("renders iOS specific guide when inside Naver on iPhone", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 NAVER/12.2.0");
    render(<InAppBrowserChecker />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/우측 하단의/)).toBeInTheDocument();
    expect(screen.getByText(/'Safari로 열기'/)).toBeInTheDocument();
  });

  it("dismisses the guide when the close button is clicked", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 NAVER/12.2.0");
    const { container } = render(<InAppBrowserChecker />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    const closeButton = screen.getByLabelText("알림 닫기");
    fireEvent.click(closeButton);

    expect(container.firstChild).toBeNull();
  });
});

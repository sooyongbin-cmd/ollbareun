import { describe, expect, it } from "vitest";
import { isInAppBrowserUserAgent } from "./in-app-browser";

describe("in-app browser helper", () => {
  it("detects kakaotalk useragent", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 9.8.2";
    expect(isInAppBrowserUserAgent(ua)).toBe(true);
  });

  it("detects naver useragent", () => {
    const ua = "Mozilla/5.0 (iPad; CPU OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 NAVER(inapp; search; 1000; 12.4.2)";
    expect(isInAppBrowserUserAgent(ua)).toBe(true);
  });

  it("does not detect chrome as in-app browser", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";
    expect(isInAppBrowserUserAgent(ua)).toBe(false);
  });
});

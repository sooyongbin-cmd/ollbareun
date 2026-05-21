import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

describe("juso popup route", () => {
  it("submits the popup to the official road-address popup API", async () => {
    vi.stubEnv("juso_key", "TEST_KEY");

    const response = await GET(new Request("https://example.com/api/juso/popup"));
    const html = await response.text();

    expect(html).toContain('action="https://business.juso.go.kr/addrlink/addrMapUrl.do"');
    expect(html).toContain('name="confmKey" value="TEST_KEY"');
    expect(html).toContain('name="returnUrl" value="https://example.com/api/juso/popup"');
    expect(html).toContain('name="resultType" value="4"');
  });

  it("passes returned address fields to the opener callback", async () => {
    const body = new URLSearchParams({
      inputYn: "Y",
      roadFullAddr: "서울특별시 중구 세종대로 110",
      roadAddrPart1: "서울특별시 중구 세종대로 110",
      addrDetail: "101동 202호",
      roadAddrPart2: "(태평로1가)",
      zipNo: "04524",
    });

    const response = await POST(
      new Request("https://example.com/api/juso/popup", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }),
    );
    const html = await response.text();

    expect(html).toContain("window.opener.jusoCallBack");
    expect(html).toContain("서울특별시 중구 세종대로 110");
    expect(html).toContain("101동 202호");
    expect(html).toContain("04524");
    expect(html).toContain("window.close()");
  });
});

import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("kakao maps sdk route", () => {
  it("returns a loader that injects the Kakao Maps SDK with services enabled", async () => {
    vi.stubEnv("kakao_map_key", "KAKAO_TEST_KEY");

    const response = GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/javascript; charset=utf-8");
    expect(body).toContain(
      "https://dapi.kakao.com/v2/maps/sdk.js?appkey=KAKAO_TEST_KEY&libraries=services&autoload=false",
    );
    expect(body).toContain("__ollbareunKakaoMapSdkLoaded");
  });
});

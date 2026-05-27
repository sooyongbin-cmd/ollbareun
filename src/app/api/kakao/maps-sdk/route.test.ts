import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("kakao maps sdk route", () => {
  it("redirects to the Kakao Maps SDK with services enabled", () => {
    vi.stubEnv("kakao_map_key", "KAKAO_TEST_KEY");

    const response = GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://dapi.kakao.com/v2/maps/sdk.js?appkey=KAKAO_TEST_KEY&libraries=services&autoload=false",
    );
  });
});

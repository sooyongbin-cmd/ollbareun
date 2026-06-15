import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/kakao/reverse-geocode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("kakao_map_key", "MOCK_APP_KEY");
  });

  it("returns 500 when kakao_map_key is not configured", async () => {
    vi.stubEnv("kakao_map_key", "");

    const request = new Request("http://localhost/api/kakao/reverse-geocode?lat=37.5665&lng=126.978");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Kakao map key is not configured.");
  });

  it("returns 400 when lat or lng parameters are missing", async () => {
    const request = new Request("http://localhost/api/kakao/reverse-geocode?lat=37.5665");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("위도와 경도를 입력하세요.");
  });

  it("returns 404 when Kakao API returns empty documents list", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        documents: [],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("http://localhost/api/kakao/reverse-geocode?lat=37.5665&lng=126.978");
    const response = await GET(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("해당 좌표의 주소 정보를 찾지 못했습니다.");
  });

  it("returns road address when available", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        documents: [
          {
            road_address: {
              address_name: "서울특별시 중구 세종대로 110",
            },
            address: {
              address_name: "서울특별시 중구 태평로1가 31",
            },
          },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("http://localhost/api/kakao/reverse-geocode?lat=37.5665&lng=126.978");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.address).toBe("서울특별시 중구 세종대로 110");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("coord2address.json?x=126.978&y=37.5665"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "KakaoAK MOCK_APP_KEY",
        }),
      })
    );
  });

  it("falls back to land address when road address is missing", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        documents: [
          {
            road_address: null,
            address: {
              address_name: "서울특별시 중구 태평로1가 31",
            },
          },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("http://localhost/api/kakao/reverse-geocode?lat=37.5665&lng=126.978");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.address).toBe("서울특별시 중구 태평로1가 31");
  });
});

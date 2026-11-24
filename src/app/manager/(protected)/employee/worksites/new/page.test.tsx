import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorksiteNewPage from "./page";

const searchKakaoPlaces = vi.hoisted(() => vi.fn());
vi.mock("../worksite-gps-picker", async (importOriginal) => ({
  ...await importOriginal<typeof import("../worksite-gps-picker")>(),
  searchKakaoPlaces,
}));

async function selectPlace(name: string, address: string, y = "35.126906", x = "129.109566") {
  searchKakaoPlaces.mockResolvedValueOnce([
    { id: name, place_name: name, road_address_name: address, address_name: "", y, x },
  ]);
  const user = userEvent.setup();
  const search = screen.getByLabelText("카카오 장소 검색");
  await user.clear(search);
  await user.type(search, name);
  await user.click(screen.getByRole("button", { name: "장소 검색" }));
  await user.click(await screen.findByRole("button", { name: new RegExp(name) }));
}

const push = vi.fn();
const MockGeocoder = vi.fn(function Geocoder() {
  return { addressSearch: vi.fn() };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("worksite new page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = "";
    delete window.kakao;
    push.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/worksites")) {
          const body = JSON.parse(String(init?.body));
          expect(body).toMatchObject({
            name: "인천 현장",
            address: "인천광역시 동구 송림로 1",
            gpsInfo: {
              latitude: 37.1,
              longitude: 126.7,
            },
            radiusMeters: "100",
          });
          return Response.json({
            worksite: {
              id: "work-3",
              name: "인천 현장",
              address: "인천광역시 동구 송림로 1",
            },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("loads the Kakao map SDK synchronously so GPS input can render the map", async () => {
    render(<WorksiteNewPage />);

    await waitFor(() => {
      const script = document.head.querySelector<HTMLScriptElement>('script[src="/api/kakao/maps-sdk"]');
      expect(script).toBeInTheDocument();
      expect(script?.async).toBe(false);
    });
  });

  it("allows editing the worksite address and hides address GPS display", () => {
    render(<WorksiteNewPage />);

    expect(screen.getByLabelText("근무지주소")).not.toHaveAttribute("readonly");
    expect(screen.getByLabelText("허용반경(m)")).toHaveValue("100");
    expect(screen.queryByText("주소 기준 GPS")).not.toBeInTheDocument();
  });

  it("marks the actual Kakao map container with the worksite map test attributes", () => {
    render(<WorksiteNewPage />);

    const map = screen.getByTestId("worksite-map");
    expect(map).toHaveAttribute("data-test-id", "worksite-map");
  });

  it("recenters and relayouts the map when a Kakao place is selected", async () => {
    const map = {
      setCenter: vi.fn(),
      relayout: vi.fn(),
    };
    const marker = {
      setPosition: vi.fn(),
    };
    const latLngs: Array<{ latitude: number; longitude: number }> = [];

    window.kakao = {
      maps: {
        load: (callback) => callback(),
        LatLng: vi.fn(function LatLng(latitude: number, longitude: number) {
          latLngs.push({ latitude, longitude });
          return {
            getLat: () => latitude,
            getLng: () => longitude,
          };
        }),
        Map: vi.fn(function Map() {
          return map;
        }),
        Marker: vi.fn(function Marker() {
          return marker;
        }),
        event: {
          addListener: vi.fn(),
        },
        services: {
          Geocoder: MockGeocoder,
          Status: {
            OK: "OK",
          },
        },
      },
    };

    render(<WorksiteNewPage />);

    await selectPlace("테스트 사업장", "부산광역시 남구 수영로 1");

    await waitFor(() => {
      expect(screen.getByText("선택한 GPS정보: 35.126906, 129.109566")).toBeInTheDocument();
      expect(latLngs).toContainEqual({ latitude: 35.126906, longitude: 129.109566 });
      expect(map.relayout).toHaveBeenCalled();
    });
  });

  it("keeps the marker on the selected GPS after the map is dragged", async () => {
    const map = {
      setCenter: vi.fn(),
      relayout: vi.fn(),
    };
    const marker = {
      setPosition: vi.fn(),
    };
    const latLngs: Array<{ latitude: number; longitude: number }> = [];
    const listeners = new Map<string, () => void>();

    window.kakao = {
      maps: {
        load: (callback) => callback(),
        LatLng: vi.fn(function LatLng(latitude: number, longitude: number) {
          const position = {
            latitude,
            longitude,
            getLat: () => latitude,
            getLng: () => longitude,
          };
          latLngs.push({ latitude, longitude });
          return position;
        }),
        Map: vi.fn(function Map() {
          return map;
        }),
        Marker: vi.fn(function Marker() {
          return marker;
        }),
        event: {
          addListener: vi.fn((_map, eventName: string, handler: () => void) => {
            listeners.set(eventName, handler);
          }),
        },
        services: {
          Geocoder: MockGeocoder,
          Status: {
            OK: "OK",
          },
        },
      },
    };

    render(<WorksiteNewPage />);

    await selectPlace("테스트 사업장", "부산광역시 남구 수영로 1");

    await waitFor(() => {
      expect(screen.getByText("선택한 GPS정보: 35.126906, 129.109566")).toBeInTheDocument();
      expect(listeners.has("dragend")).toBe(true);
    });

    const setCenterCallsBeforeDrag = map.setCenter.mock.calls.length;

    act(() => {
      listeners.get("dragend")?.();
    });

    const lastMarkerPosition = marker.setPosition.mock.calls.at(-1)?.[0];
    expect(lastMarkerPosition).toMatchObject({ latitude: 35.126906, longitude: 129.109566 });
    expect(map.setCenter).toHaveBeenCalledTimes(setCenterCallsBeforeDrag);
  });

  it("uses a red custom marker image for map selections", async () => {
    const map = {
      setCenter: vi.fn(),
      relayout: vi.fn(),
    };
    const marker = {
      setPosition: vi.fn(),
    };
    const markerOptions: unknown[] = [];
    const markerImages: Array<{ src: string; size: unknown; options: unknown }> = [];

    window.kakao = {
      maps: {
        load: (callback) => callback(),
        LatLng: vi.fn(function LatLng(latitude: number, longitude: number) {
          return {
            getLat: () => latitude,
            getLng: () => longitude,
          };
        }),
        Map: vi.fn(function Map() {
          return map;
        }),
        Marker: vi.fn(function Marker(options: unknown) {
          markerOptions.push(options);
          return marker;
        }),
        MarkerImage: vi.fn(function MarkerImage(src: string, size: unknown, options: unknown) {
          const image = { src, size, options };
          markerImages.push(image);
          return image;
        }),
        Size: vi.fn(function Size(width: number, height: number) {
          return { width, height };
        }),
        Point: vi.fn(function Point(x: number, y: number) {
          return { x, y };
        }),
        event: {
          addListener: vi.fn(),
        },
        services: {
          Geocoder: MockGeocoder,
          Status: {
            OK: "OK",
          },
        },
      },
    };

    render(<WorksiteNewPage />);

    await waitFor(() => {
      expect(markerOptions.length).toBeGreaterThan(0);
    });

    expect(markerImages[0]?.src).toContain("data:image/svg+xml");
    expect(markerImages[0]?.src).toContain("%23e03131");
    expect(markerOptions[0]).toMatchObject({
      image: markerImages[0],
    });
  });

  it("shows an alert after saving and returns to worksite management", async () => {
    const user = userEvent.setup();

    render(<WorksiteNewPage />);

    await user.type(screen.getByLabelText("근무지명"), "인천 현장");
    await selectPlace("테스트 사업장", "인천광역시 동구 송림로 1", "37.1", "126.7");
    expect(screen.queryByText("주소 기준 GPS")).not.toBeInTheDocument();
    expect(screen.getByTestId("worksite-map")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("자료를 저장하였습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/worksites");
  });

  it("replaces the address and GPS when another Kakao place is selected", async () => {
    render(<WorksiteNewPage />);
    await selectPlace("첫 사업장", "서울특별시 중구 세종대로 110", "37.566", "126.978");
    expect(screen.getByLabelText("근무지주소")).toHaveValue("서울특별시 중구 세종대로 110");
    expect(screen.getByLabelText("GPS정보")).toHaveValue("37.566000, 126.978000");

    await selectPlace("둘째 사업장", "부산광역시 남구 수영로 1");
    expect(searchKakaoPlaces).toHaveBeenLastCalledWith("둘째 사업장");
    expect(screen.getByLabelText("근무지주소")).toHaveValue("부산광역시 남구 수영로 1");
    expect(screen.getByLabelText("GPS정보")).toHaveValue("35.126906, 129.109566");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("looks up the edited address and replaces coordinates from a selected place", async () => {
    const user = userEvent.setup();
    const geocode = vi.fn(async () => Response.json({
      gpsInfo: { latitude: 35.123456, longitude: 129.123456 },
    }));
    vi.stubGlobal("fetch", geocode);
    render(<WorksiteNewPage />);
    await selectPlace("첫 사업장", "서울특별시 중구 세종대로 110", "37.566", "126.978");

    const address = screen.getByLabelText("근무지주소");
    await user.clear(address);
    await user.type(address, "부산광역시 남구 수영로 1");
    expect(screen.getByLabelText("GPS정보")).toHaveValue("");
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByLabelText("GPS정보")).toHaveValue("35.123456, 129.123456");
    });
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(geocode).toHaveBeenCalledWith(
      `/api/kakao/geocode?query=${encodeURIComponent("부산광역시 남구 수영로 1")}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});

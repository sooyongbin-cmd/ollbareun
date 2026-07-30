import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomepageContactMap from "./homepage-contact-map";

describe("homepage contact map", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    delete window.kakao;
  });

  it("renders the head office on a Kakao map", async () => {
    const setCenter = vi.fn();
    const relayout = vi.fn();
    const map = { relayout, setCenter };
    const Map = vi.fn(function Map() {
      return map;
    });
    const Marker = vi.fn(function Marker() {
      return { setMap: vi.fn() };
    });
    const LatLng = vi.fn(function LatLng(latitude: number, longitude: number) {
      return {
        getLat: () => latitude,
        getLng: () => longitude,
        latitude,
        longitude,
      };
    });

    Object.defineProperty(window, "kakao", {
      configurable: true,
      value: {
        maps: {
          load: (callback: () => void) => callback(),
          LatLng,
          Map,
          Marker,
        },
      },
    });

    render(<HomepageContactMap />);

    await waitFor(() => {
      expect(Map).toHaveBeenCalledTimes(1);
    });

    const position = expect.objectContaining({
      latitude: 35.1673384631299,
      longitude: 128.955819688911,
    });
    expect(Map).toHaveBeenCalledWith(screen.getByTestId("homepage-contact-map"), {
      center: position,
      level: 3,
    });
    expect(Marker).toHaveBeenCalledWith({
      position,
      map,
    });
    expect(screen.queryByText("지도를 불러오는 중입니다.")).not.toBeInTheDocument();
  });
});

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

  it("geocodes the supplied company address before placing the marker", async () => {
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
    const addressSearch = vi.fn((
      _address: string,
      callback: (result: { x: string; y: string }[], status: string) => void,
    ) => callback([{ x: "128.901234", y: "35.123456" }], "OK"));
    const Geocoder = vi.fn(function Geocoder() {
      return { addressSearch };
    });
    const companyAddress = "부산광역시 강서구 유통단지1로 41";

    Object.defineProperty(window, "kakao", {
      configurable: true,
      value: {
        maps: {
          load: (callback: () => void) => callback(),
          LatLng,
          Map,
          Marker,
          services: { Geocoder },
        },
      },
    });

    render(<HomepageContactMap address={companyAddress} />);

    await waitFor(() => {
      expect(Map).toHaveBeenCalledTimes(1);
    });

    expect(addressSearch).toHaveBeenCalledWith(companyAddress, expect.any(Function));
    const position = expect.objectContaining({
      latitude: 35.123456,
      longitude: 128.901234,
    });
    expect(Map).toHaveBeenCalledWith(screen.getByTestId("homepage-contact-map"), {
      center: position,
      level: 3,
    });
    expect(Marker).toHaveBeenCalledWith({
      position,
      map,
    });
  });

  it("keeps contact details available when the map SDK fails", async () => {
    render(<HomepageContactMap />);

    const script = document.head.querySelector<HTMLScriptElement>(
      'script[src="/api/kakao/maps-sdk"]',
    );
    expect(script).not.toBeNull();
    script?.onerror?.(new Event("error"));

    expect(await screen.findByText("카카오 지도를 불러오지 못했습니다.")).toBeInTheDocument();
    expect(
      screen.getByText("부산광역시 강서구 유통단지1로 41, 105동 217・218호", {
        selector: "span",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "전화 051-465-7767" })).toHaveAttribute(
      "href",
      "tel:0514657767",
    );
    expect(screen.getByRole("link", { name: "olbareum@naver.com" })).toHaveAttribute(
      "href",
      "mailto:olbareum@naver.com",
    );
  });
});

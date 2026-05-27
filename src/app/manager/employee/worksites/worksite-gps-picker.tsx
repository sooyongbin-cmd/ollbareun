"use client";

import { useEffect, useRef, useState } from "react";
import { formatGpsInfo, parseGpsInfo, type GpsInfo } from "@/lib/gps";

type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type KakaoMap = {
  setCenter: (position: KakaoLatLng) => void;
};

type KakaoMarker = {
  setPosition: (position: KakaoLatLng) => void;
};

type KakaoMouseEvent = {
  latLng: KakaoLatLng;
};

type KakaoGeocodeResult = {
  x: string;
  y: string;
};

type KakaoGlobal = {
  maps: {
    load: (callback: () => void) => void;
    LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
    Map: new (element: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
    Marker: new (options: { position: KakaoLatLng; map: KakaoMap }) => KakaoMarker;
    event: {
      addListener: (map: KakaoMap, eventName: "click", handler: (event: KakaoMouseEvent) => void) => void;
    };
    services: {
      Geocoder: new () => {
        addressSearch: (
          address: string,
          callback: (result: KakaoGeocodeResult[], status: string) => void,
        ) => void;
      };
      Status: {
        OK: string;
      };
    };
  };
};

declare global {
  interface Window {
    kakao?: KakaoGlobal;
  }
}

type WorksiteGpsPickerProps = {
  address: string;
  value: GpsInfo | null;
  onChange: (gps: GpsInfo | null) => void;
};

type GeocodeResponse = {
  gpsInfo?: GpsInfo;
  error?: string;
};

let kakaoLoader: Promise<void> | null = null;

function loadKakaoMap() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Browser only"));
  }

  const kakao = window.kakao;

  if (kakao?.maps) {
    return new Promise<void>((resolve) => kakao.maps.load(resolve));
  }

  if (!kakaoLoader) {
    kakaoLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/api/kakao/maps-sdk";
      script.async = true;
      script.onload = () => {
        const loadedKakao = window.kakao;
        if (loadedKakao?.maps) {
          loadedKakao.maps.load(resolve);
        } else {
          reject(new Error("Kakao map SDK를 불러오지 못했습니다."));
        }
      };
      script.onerror = () => reject(new Error("Kakao map SDK를 불러오지 못했습니다."));
      document.head.appendChild(script);
    });
  }

  return kakaoLoader;
}

function toLatLng(gps: GpsInfo) {
  const kakao = window.kakao;
  if (!kakao) {
    throw new Error("Kakao map SDK를 불러오지 못했습니다.");
  }

  return new kakao.maps.LatLng(gps.latitude, gps.longitude);
}

export default function WorksiteGpsPicker({ address, value, onChange }: WorksiteGpsPickerProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const manualInputRef = useRef(false);
  const [addressGps, setAddressGps] = useState<GpsInfo | null>(null);
  const [inputValue, setInputValue] = useState(formatGpsInfo(value));
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (manualInputRef.current) {
      manualInputRef.current = false;
      return;
    }

    setInputValue(formatGpsInfo(value));
  }, [value]);

  useEffect(() => {
    let ignore = false;

    async function setupMap() {
      if (!mapElementRef.current) {
        return;
      }

      try {
        await loadKakaoMap();
        if (ignore || !mapElementRef.current) {
          return;
        }

        const kakao = window.kakao;
        if (!kakao) {
          throw new Error("Kakao map SDK를 불러오지 못했습니다.");
        }

        const fallbackGps = value ?? addressGps ?? { latitude: 37.566826, longitude: 126.9786567 };
        const center = toLatLng(fallbackGps);

        if (!mapRef.current) {
          mapRef.current = new kakao.maps.Map(mapElementRef.current, {
            center,
            level: 3,
          });
          markerRef.current = new kakao.maps.Marker({ position: center, map: mapRef.current });
          kakao.maps.event.addListener(mapRef.current, "click", (mouseEvent) => {
            const latLng = mouseEvent.latLng;
            onChange({ latitude: latLng.getLat(), longitude: latLng.getLng() });
          });
        } else {
          mapRef.current.setCenter(center);
          markerRef.current?.setPosition(center);
        }
      } catch (error) {
        if (!ignore) {
          setStatus(error instanceof Error ? error.message : "지도를 불러오지 못했습니다.");
        }
      }
    }

    void setupMap();

    return () => {
      ignore = true;
    };
  }, [addressGps, onChange, value]);

  useEffect(() => {
    let ignore = false;
    const normalizedAddress = address.trim();

    if (!normalizedAddress) {
      queueMicrotask(() => {
        if (!ignore) {
          setAddressGps(null);
        }
      });
      return () => {
        ignore = true;
      };
    }

    async function geocodeAddress() {
      try {
        const response = await fetch(`/api/kakao/geocode?query=${encodeURIComponent(normalizedAddress)}`);
        const payload = (await response.json()) as GeocodeResponse;

        if (ignore) {
          return;
        }

        if (!response.ok || !payload.gpsInfo) {
          setAddressGps(null);
          setStatus(payload.error ?? "입력한 주소의 GPS정보를 찾지 못했습니다.");
          return;
        }

        setAddressGps(payload.gpsInfo);
        setStatus("");

        if (!value) {
          onChange(payload.gpsInfo);
        }
      } catch (error) {
        if (!ignore) {
          setStatus(error instanceof Error ? error.message : "주소의 GPS정보를 확인하지 못했습니다.");
        }
      }
    }

    void geocodeAddress();

    return () => {
      ignore = true;
    };
  }, [address, onChange, value]);

  useEffect(() => {
    if (!window.kakao?.maps || !mapRef.current || !markerRef.current) {
      return;
    }

    const nextGps = value ?? addressGps;
    if (!nextGps) {
      return;
    }

    const position = toLatLng(nextGps);
    markerRef.current.setPosition(position);
    mapRef.current.setCenter(position);
  }, [addressGps, value]);

  function handleGpsInputChange(nextValue: string) {
    manualInputRef.current = true;
    setInputValue(nextValue);
    onChange(parseGpsInfo(nextValue));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[14px] font-semibold text-ink-muted-48 ml-1">주소 기준 GPS</p>
        <div className="field bg-canvas text-ink-muted-48">
          {addressGps
            ? formatGpsInfo(addressGps)
            : status || (address.trim() ? "주소의 GPS정보를 확인하는 중입니다." : "근무지주소 입력 후 자동으로 표시됩니다.")}
        </div>
      </div>

      <div
        ref={mapElementRef}
        className="h-[360px] w-full overflow-hidden rounded-[16px] border border-hairline bg-canvas"
        data-testid="worksite-map"
      />

      <div className="space-y-2">
        <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-gps-info">
          GPS정보
        </label>
        <input
          className="field"
          id="worksite-gps-info"
          inputMode="decimal"
          placeholder="37.123456, 127.123456"
          required
          value={inputValue}
          onChange={(event) => handleGpsInputChange(event.target.value)}
        />
        <p className="text-[13px] text-ink-muted-48">
          {value ? `선택한 GPS정보: ${formatGpsInfo(value)}` : status || "지도에서 실제 근무지를 클릭하거나 GPS정보를 입력하세요."}
        </p>
      </div>
    </div>
  );
}

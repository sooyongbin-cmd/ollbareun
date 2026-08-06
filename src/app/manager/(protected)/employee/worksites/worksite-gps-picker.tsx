"use client";

import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";
import { formatGpsInfo, parseGpsInfo, type GpsInfo } from "@/lib/gps";

type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type KakaoMap = {
  relayout?: () => void;
  setCenter: (position: KakaoLatLng) => void;
};

type KakaoMarker = {
  setPosition: (position: KakaoLatLng) => void;
};

type KakaoMarkerImage = unknown;

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
    Marker: new (options: { position: KakaoLatLng; map: KakaoMap; image?: KakaoMarkerImage }) => KakaoMarker;
    MarkerImage?: new (
      src: string,
      size: unknown,
      options?: { offset?: unknown },
    ) => KakaoMarkerImage;
    Point?: new (x: number, y: number) => unknown;
    Size?: new (width: number, height: number) => unknown;
    event: {
      addListener: (
        map: KakaoMap,
        eventName: "click" | "dragend",
        handler: (event?: KakaoMouseEvent) => void,
      ) => void;
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
    __ollbareunKakaoMapSdkLoaded?: () => void;
    __ollbareunKakaoMapSdkError?: () => void;
  }
}

type WorksiteGpsPickerProps = {
  address: string;
  value: GpsInfo | null;
  onChange: (gps: GpsInfo | null) => void;
  hideInput?: boolean;
};

type GeocodeResponse = {
  gpsInfo?: GpsInfo;
  error?: string;
};

let kakaoLoader: Promise<void> | null = null;

const RED_MARKER_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path fill="#e03131" stroke="#9f1239" stroke-width="2" d="M17 42s14-15.2 14-26A14 14 0 1 0 3 16c0 10.8 14 26 14 26Z"/><circle cx="17" cy="16" r="5.5" fill="#fff"/></svg>',
);
const RED_MARKER_IMAGE_SRC = `data:image/svg+xml;charset=UTF-8,${RED_MARKER_SVG}`;

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
      script.async = false;
      script.src = "/api/kakao/maps-sdk";
      const cleanupCallbacks = () => {
        delete window.__ollbareunKakaoMapSdkLoaded;
        delete window.__ollbareunKakaoMapSdkError;
      };

      window.__ollbareunKakaoMapSdkLoaded = () => {
        const loadedKakao = window.kakao;
        if (loadedKakao?.maps) {
          loadedKakao.maps.load(() => {
            cleanupCallbacks();
            resolve();
          });
        } else {
          cleanupCallbacks();
          reject(new Error("Kakao map SDK를 불러오지 못했습니다."));
        }
      };
      window.__ollbareunKakaoMapSdkError = () => {
        cleanupCallbacks();
        reject(new Error("Kakao map SDK를 불러오지 못했습니다."));
      };
      script.onerror = window.__ollbareunKakaoMapSdkError;
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

function updateMapPosition(map: KakaoMap, marker: KakaoMarker | null, position: KakaoLatLng) {
  map.relayout?.();
  map.setCenter(position);
  marker?.setPosition(position);
}

function createMarkerImage() {
  const kakao = window.kakao;
  if (!kakao?.maps.MarkerImage || !kakao.maps.Size || !kakao.maps.Point) {
    return undefined;
  }

  return new kakao.maps.MarkerImage(RED_MARKER_IMAGE_SRC, new kakao.maps.Size(34, 44), {
    offset: new kakao.maps.Point(17, 42),
  });
}

export default function WorksiteGpsPicker({ address, value, onChange, hideInput = false }: WorksiteGpsPickerProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const manualInputRef = useRef(false);
  const selectedGpsRef = useRef<GpsInfo | null>(value);
  const [addressGps, setAddressGps] = useState<GpsInfo | null>(null);
  const [inputValue, setInputValue] = useState(formatGpsInfo(value));
  const [status, setStatus] = useState("");

  useEffect(() => {
    selectedGpsRef.current = value ?? addressGps;
  }, [addressGps, value]);

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
          markerRef.current = new kakao.maps.Marker({
            position: center,
            map: mapRef.current,
            image: createMarkerImage(),
          });
          updateMapPosition(mapRef.current, markerRef.current, center);
          kakao.maps.event.addListener(mapRef.current, "click", (mouseEvent) => {
            const latLng = mouseEvent?.latLng;
            if (!latLng) {
              return;
            }
            onChange({ latitude: latLng.getLat(), longitude: latLng.getLng() });
          });
          kakao.maps.event.addListener(mapRef.current, "dragend", () => {
            const selectedGps = selectedGpsRef.current;
            if (!selectedGps) {
              return;
            }

            markerRef.current?.setPosition(toLatLng(selectedGps));
          });
        } else {
          updateMapPosition(mapRef.current, markerRef.current, center);
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
    updateMapPosition(mapRef.current, markerRef.current, position);
  }, [addressGps, value]);

  function handleGpsInputChange(nextValue: string) {
    manualInputRef.current = true;
    setInputValue(nextValue);
    onChange(parseGpsInfo(nextValue));
  }

  return (
    <div className="space-y-4">
      <div
        ref={mapElementRef}
        className="h-[22.5rem] w-full overflow-hidden rounded-lg border border-border bg-background"
        data-test-id="worksite-map"
        data-testid="worksite-map"
      />

      {!hideInput ? (
        <div className="space-y-2">
          <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-gps-info">
            GPS정보
          </label>
          <Input
            className="w-full"
            id="worksite-gps-info"
            inputMode="decimal"
            placeholder="37.123456, 127.123456"
            required
            value={inputValue}
            onChange={(event) => handleGpsInputChange(event.target.value)}
          />
          <p className="text-[0.8125rem] text-muted-foreground">
            {value ? `선택한 GPS정보: ${formatGpsInfo(value)}` : status || "지도에서 실제 근무지를 클릭하거나 GPS정보를 입력하세요."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

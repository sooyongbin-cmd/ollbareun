"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type GpsInfo } from "@/lib/gps";
import { distanceMeters } from "@/lib/phase1";

type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type KakaoMap = {
  relayout?: () => void;
  setCenter: (position: KakaoLatLng) => void;
  setBounds?: (bounds: KakaoLatLngBounds) => void;
};

type KakaoLatLngBounds = {
  extend: (position: KakaoLatLng) => void;
};

type KakaoMarker = {
  setMap?: (map: KakaoMap | null) => void;
  setPosition: (position: KakaoLatLng) => void;
};

type KakaoCircle = {
  setMap?: (map: KakaoMap | null) => void;
  setPosition?: (position: KakaoLatLng) => void;
  setRadius?: (radius: number) => void;
};

type KakaoMarkerImage = unknown;

type KakaoGlobal = {
  maps: {
    load: (callback: () => void) => void;
    LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
    LatLngBounds?: new () => KakaoLatLngBounds;
    Map: new (element: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
    Marker: new (options: { position: KakaoLatLng; map: KakaoMap; image?: KakaoMarkerImage }) => KakaoMarker;
    Circle: new (options: {
      center: KakaoLatLng;
      radius: number;
      strokeWeight: number;
      strokeColor: string;
      strokeOpacity: number;
      strokeStyle: string;
      fillColor: string;
      fillOpacity: number;
      map: KakaoMap;
    }) => KakaoCircle;
    MarkerImage?: new (src: string, size: unknown, options?: { offset?: unknown }) => KakaoMarkerImage;
    Point?: new (x: number, y: number) => unknown;
    Size?: new (width: number, height: number) => unknown;
  };
};

type WindowWithKakao = Window & {
  kakao?: KakaoGlobal;
  __ollbareunKakaoMapSdkLoaded?: () => void;
  __ollbareunKakaoMapSdkError?: () => void;
};

type AttendanceMapWorksite = {
  name: string;
  gps_info: GpsInfo;
  radius_meters: number;
};

type AttendanceMapSectionProps = {
  worksite: AttendanceMapWorksite | null;
  currentLatitude: string;
  currentLongitude: string;
};

let kakaoLoader: Promise<void> | null = null;

const WORKSITE_MARKER_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path fill="#e03131" stroke="#9f1239" stroke-width="2" d="M17 42s14-15.2 14-26A14 14 0 1 0 3 16c0 10.8 14 26 14 26Z"/><circle cx="17" cy="16" r="5.5" fill="#fff"/></svg>',
);
const CURRENT_MARKER_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38"><path fill="#2563eb" stroke="#1e3a8a" stroke-width="2" d="M15 36s12-13 12-23A12 12 0 1 0 3 13c0 10 12 23 12 23Z"/><circle cx="15" cy="13" r="4.8" fill="#fff"/></svg>',
);
const WORKSITE_MARKER_IMAGE_SRC = `data:image/svg+xml;charset=UTF-8,${WORKSITE_MARKER_SVG}`;
const CURRENT_MARKER_IMAGE_SRC = `data:image/svg+xml;charset=UTF-8,${CURRENT_MARKER_SVG}`;

function getKakaoWindow() {
  return window as WindowWithKakao;
}

function loadKakaoMap() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Browser only"));
  }

  const kakaoWindow = getKakaoWindow();
  if (kakaoWindow.kakao?.maps) {
    return new Promise<void>((resolve) => kakaoWindow.kakao?.maps.load(resolve));
  }

  if (kakaoLoader && !document.head.querySelector<HTMLScriptElement>('script[src="/api/kakao/maps-sdk"]')) {
    kakaoLoader = null;
  }

  if (!kakaoLoader) {
    kakaoLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.async = false;
      script.src = "/api/kakao/maps-sdk";

      const cleanupCallbacks = () => {
        delete kakaoWindow.__ollbareunKakaoMapSdkLoaded;
        delete kakaoWindow.__ollbareunKakaoMapSdkError;
      };

      kakaoWindow.__ollbareunKakaoMapSdkLoaded = () => {
        const loadedKakao = kakaoWindow.kakao;
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
      kakaoWindow.__ollbareunKakaoMapSdkError = () => {
        cleanupCallbacks();
        reject(new Error("Kakao map SDK를 불러오지 못했습니다."));
      };
      script.onerror = kakaoWindow.__ollbareunKakaoMapSdkError;
      document.head.appendChild(script);
    });
  }

  return kakaoLoader;
}

function toLatLng(gps: GpsInfo) {
  const kakao = getKakaoWindow().kakao;
  if (!kakao) {
    throw new Error("Kakao map SDK를 불러오지 못했습니다.");
  }

  return new kakao.maps.LatLng(gps.latitude, gps.longitude);
}

function createMarkerImage(src: string, width: number, height: number, offsetX: number, offsetY: number) {
  const kakao = getKakaoWindow().kakao;
  if (!kakao?.maps.MarkerImage || !kakao.maps.Size || !kakao.maps.Point) {
    return undefined;
  }

  return new kakao.maps.MarkerImage(src, new kakao.maps.Size(width, height), {
    offset: new kakao.maps.Point(offsetX, offsetY),
  });
}

function parseCurrentGps(latitude: string, longitude: string): GpsInfo | null {
  if (!latitude.trim() || !longitude.trim()) {
    return null;
  }

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return null;
  }

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
}

function formatCurrentDistance(worksite: AttendanceMapWorksite, currentGps: GpsInfo | null) {
  if (!currentGps) {
    return "나와의 거리 : 확인 중";
  }

  const distance = distanceMeters(
    worksite.gps_info.latitude,
    worksite.gps_info.longitude,
    currentGps.latitude,
    currentGps.longitude,
  );

  return `나와의 거리 : ${Math.round(distance)}m`;
}

function fitMapToWorksiteAndCurrentLocation(map: KakaoMap, worksitePosition: KakaoLatLng, currentGps: GpsInfo | null) {
  const kakao = getKakaoWindow().kakao;

  if (!currentGps || !kakao?.maps.LatLngBounds || !map.setBounds) {
    map.setCenter(worksitePosition);
    return;
  }

  const currentPosition = toLatLng(currentGps);
  const bounds = new kakao.maps.LatLngBounds();
  bounds.extend(worksitePosition);
  bounds.extend(currentPosition);
  map.setBounds(bounds);
}

export default function AttendanceMapSection({
  worksite,
  currentLatitude,
  currentLongitude,
}: AttendanceMapSectionProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const worksiteMarkerRef = useRef<KakaoMarker | null>(null);
  const currentMarkerRef = useRef<KakaoMarker | null>(null);
  const geofenceCircleRef = useRef<KakaoCircle | null>(null);
  const [status, setStatus] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);

  const currentGps = useMemo(
    () => parseCurrentGps(currentLatitude, currentLongitude),
    [currentLatitude, currentLongitude],
  );

  useEffect(() => {
    let ignore = false;

    async function setupMap() {
      if (!mapElementRef.current || !worksite) {
        return;
      }

      try {
        await loadKakaoMap();
        if (ignore || !mapElementRef.current) {
          return;
        }

        const kakao = getKakaoWindow().kakao;
        if (!kakao) {
          throw new Error("Kakao map SDK를 불러오지 못했습니다.");
        }

        const worksitePosition = toLatLng(worksite.gps_info);

        if (!mapRef.current) {
          mapRef.current = new kakao.maps.Map(mapElementRef.current, {
            center: worksitePosition,
            level: 3,
          });
          worksiteMarkerRef.current = new kakao.maps.Marker({
            position: worksitePosition,
            map: mapRef.current,
            image: createMarkerImage(WORKSITE_MARKER_IMAGE_SRC, 34, 44, 17, 42),
          });
          geofenceCircleRef.current = new kakao.maps.Circle({
            center: worksitePosition,
            radius: worksite.radius_meters,
            strokeWeight: 2,
            strokeColor: "#2563eb",
            strokeOpacity: 0.85,
            strokeStyle: "solid",
            fillColor: "#2563eb",
            fillOpacity: 0.12,
            map: mapRef.current,
          });
          mapRef.current.relayout?.();
          fitMapToWorksiteAndCurrentLocation(mapRef.current, worksitePosition, currentGps);
        } else {
          mapRef.current.relayout?.();
          fitMapToWorksiteAndCurrentLocation(mapRef.current, worksitePosition, currentGps);
          worksiteMarkerRef.current?.setPosition(worksitePosition);
          geofenceCircleRef.current?.setPosition?.(worksitePosition);
          geofenceCircleRef.current?.setRadius?.(worksite.radius_meters);
        }

        setStatus("");
        setIsMapReady(true);
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
  }, [currentGps, worksite]);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !currentGps) {
      return;
    }

    const kakao = getKakaoWindow().kakao;
    if (!kakao) {
      return;
    }

    const currentPosition = toLatLng(currentGps);
    if (!currentMarkerRef.current) {
      currentMarkerRef.current = new kakao.maps.Marker({
        position: currentPosition,
        map: mapRef.current,
        image: createMarkerImage(CURRENT_MARKER_IMAGE_SRC, 30, 38, 15, 36),
      });
      return;
    }

    currentMarkerRef.current.setPosition(currentPosition);
    if (worksite && mapRef.current) {
      fitMapToWorksiteAndCurrentLocation(mapRef.current, toLatLng(worksite.gps_info), currentGps);
    }
  }, [currentGps, isMapReady, worksite]);

  if (!worksite) {
    return (
      <section
        className="bg-background rounded-xl p-6 border border-border shadow-sm"
        id="attendance-map-section"
      >
        <h3 className="text-[17px] font-semibold">지도</h3>
        <p className="mt-3 text-[14px] text-muted-foreground">오늘 배정된 근무지가 없어 지도를 표시할 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="bg-background rounded-xl p-6 border border-border shadow-sm" id="attendance-map-section">
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-[17px] font-semibold">지도</h3>
        <p className="text-[13px] text-muted-foreground">근무지 : {worksite.name}</p>
        <p className="text-[13px] text-muted-foreground">{formatCurrentDistance(worksite, currentGps)}</p>
      </div>
      <div
        ref={mapElementRef}
        className="h-[320px] w-full overflow-hidden rounded-lg border border-border bg-muted/40"
        data-testid="attendance-map"
        id="attendance-map-canvas"
      />
      <div className="mt-3 flex flex-wrap gap-3 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-primary" />
          현재 위치
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border border-primary bg-primary/10" />
          지오펜스 ({worksite.radius_meters}m)
        </span>
      </div>
      {status ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-3 text-center">{status}</p> : null}
    </section>
  );
}

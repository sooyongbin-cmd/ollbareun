"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_COMPANY_ADDRESS } from "@/lib/company-address";
import styles from "./page.module.css";

type HomepageKakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type HomepageKakaoMap = {
  relayout?: () => void;
  setCenter: (position: HomepageKakaoLatLng) => void;
};

type HomepageKakaoMarker = {
  setMap?: (map: HomepageKakaoMap | null) => void;
};

type HomepageKakaoMarkerImage = object;

type HomepageKakaoAddressSearchResult = {
  x: string;
  y: string;
};

type HomepageKakaoGeocoder = {
  addressSearch: (
    address: string,
    callback: (result: HomepageKakaoAddressSearchResult[], status: string) => void,
  ) => void;
};

type HomepageKakaoServices = {
  Geocoder: new () => HomepageKakaoGeocoder;
  Status?: {
    OK: string;
  };
};

type HomepageKakaoGlobal = {
  maps: {
    load: (callback: () => void) => void;
    LatLng: new (latitude: number, longitude: number) => HomepageKakaoLatLng;
    Map: new (
      element: HTMLElement,
      options: { center: HomepageKakaoLatLng; level: number },
    ) => HomepageKakaoMap;
    Marker: new (options: {
      position: HomepageKakaoLatLng;
      map: HomepageKakaoMap;
      image?: HomepageKakaoMarkerImage;
    }) => HomepageKakaoMarker;
    MarkerImage?: new (
      source: string,
      size: object,
      options?: { offset?: object },
    ) => HomepageKakaoMarkerImage;
    Size?: new (width: number, height: number) => object;
    Point?: new (x: number, y: number) => object;
    services?: HomepageKakaoServices;
  };
};

type HomepageKakaoWindow = {
  kakao?: HomepageKakaoGlobal;
  __ollbareunKakaoMapSdkLoaded?: () => void;
  __ollbareunKakaoMapSdkError?: () => void;
};

const HEAD_OFFICE = {
  latitude: 35.1673384631299,
  longitude: 128.955819688911,
};

let kakaoLoader: Promise<void> | null = null;

function getAddressSearchCandidates(address: string) {
  const normalizedAddress = address.trim().replace(/\s+/g, " ");
  const baseAddress = normalizedAddress.split(",", 1)[0]?.trim();

  return Array.from(new Set([normalizedAddress, baseAddress].filter(Boolean)));
}

function resolveCompanyPosition(kakao: HomepageKakaoGlobal, address: string) {
  const fallbackPosition = new kakao.maps.LatLng(HEAD_OFFICE.latitude, HEAD_OFFICE.longitude);
  const Geocoder = kakao.maps.services?.Geocoder;

  if (!Geocoder) {
    return Promise.resolve(fallbackPosition);
  }

  return new Promise<HomepageKakaoLatLng>((resolve) => {
    const geocoder = new Geocoder();
    const candidates = getAddressSearchCandidates(address);
    let candidateIndex = 0;
    let settled = false;

    const finish = (position: HomepageKakaoLatLng) => {
      if (!settled) {
        settled = true;
        resolve(position);
      }
    };

    const searchNextCandidate = () => {
      const candidate = candidates[candidateIndex++];
      if (!candidate) {
        finish(fallbackPosition);
        return;
      }

      try {
        geocoder.addressSearch(candidate, (result, status) => {
          const isSuccess = status === "OK" || status === kakao.maps.services?.Status?.OK;
          const match = isSuccess
            ? result.find((item) => Number.isFinite(Number(item.y)) && Number.isFinite(Number(item.x)))
            : undefined;

          if (match) {
            finish(new kakao.maps.LatLng(Number(match.y), Number(match.x)));
            return;
          }

          searchNextCandidate();
        });
      } catch {
        searchNextCandidate();
      }
    };

    searchNextCandidate();
  });
}

function getKakaoWindow() {
  return window as unknown as HomepageKakaoWindow;
}

function loadKakaoMap() {
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
        if (!loadedKakao?.maps) {
          cleanupCallbacks();
          reject(new Error("카카오 지도를 불러오지 못했습니다."));
          return;
        }

        loadedKakao.maps.load(() => {
          cleanupCallbacks();
          resolve();
        });
      };
      kakaoWindow.__ollbareunKakaoMapSdkError = () => {
        cleanupCallbacks();
        reject(new Error("카카오 지도를 불러오지 못했습니다."));
      };
      script.onerror = kakaoWindow.__ollbareunKakaoMapSdkError;
      document.head.appendChild(script);
    });
  }

  return kakaoLoader;
}

export default function HomepageContactMap({
  address = DEFAULT_COMPANY_ADDRESS,
}: {
  address?: string;
}) {
  const companyAddress = address.trim() || DEFAULT_COMPANY_ADDRESS;
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HomepageKakaoMap | null>(null);
  const markerRef = useRef<HomepageKakaoMarker | null>(null);
  const [status, setStatus] = useState("지도를 불러오는 중입니다.");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function setupMap() {
      try {
        await loadKakaoMap();
        if (ignore || !mapElementRef.current) {
          return;
        }

        const kakao = getKakaoWindow().kakao;
        if (!kakao) {
          throw new Error("카카오 지도를 불러오지 못했습니다.");
        }

        const position = await resolveCompanyPosition(kakao, companyAddress);
        if (ignore || !mapElementRef.current) {
          return;
        }

        mapRef.current = new kakao.maps.Map(mapElementRef.current, {
          center: position,
          level: 3,
        });
        const markerImage =
          kakao.maps.MarkerImage && kakao.maps.Size
            ? new kakao.maps.MarkerImage(
                "/homepage/archive/map-pin.svg",
                new kakao.maps.Size(55, 68),
                kakao.maps.Point
                  ? { offset: new kakao.maps.Point(27, 68) }
                  : undefined,
              )
            : undefined;
        markerRef.current = new kakao.maps.Marker({
          position,
          map: mapRef.current,
          ...(markerImage ? { image: markerImage } : {}),
        });
        mapRef.current.relayout?.();
        mapRef.current.setCenter(position);
        setHasError(false);
        setStatus("");
      } catch (error) {
        if (!ignore) {
          setHasError(true);
          setStatus(error instanceof Error ? error.message : "카카오 지도를 불러오지 못했습니다.");
        }
      }
    }

    void setupMap();

    return () => {
      ignore = true;
      markerRef.current?.setMap?.(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [companyAddress]);

  return (
    <div className={styles.map}>
      <div
        ref={mapElementRef}
        className={styles.mapCanvas}
        aria-label={`${companyAddress} 올바름 본사 위치 지도`}
        data-testid="homepage-contact-map"
        role="region"
      />
      {status ? (
        <div className={styles.mapStatus} aria-live="polite">
          <p>{status}</p>
          {hasError ? (
            <address>
              <span>{companyAddress}</span>
              <a href="tel:0514657767">전화 051-465-7767</a>
              <a href="mailto:olbareum@naver.com">olbareum@naver.com</a>
            </address>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
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
    }) => HomepageKakaoMarker;
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

export default function HomepageContactMap() {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HomepageKakaoMap | null>(null);
  const markerRef = useRef<HomepageKakaoMarker | null>(null);
  const [status, setStatus] = useState("지도를 불러오는 중입니다.");

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

        const position = new kakao.maps.LatLng(HEAD_OFFICE.latitude, HEAD_OFFICE.longitude);
        mapRef.current = new kakao.maps.Map(mapElementRef.current, {
          center: position,
          level: 3,
        });
        markerRef.current = new kakao.maps.Marker({
          position,
          map: mapRef.current,
        });
        mapRef.current.relayout?.();
        mapRef.current.setCenter(position);
        setStatus("");
      } catch (error) {
        if (!ignore) {
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
  }, []);

  return (
    <div className={styles.map}>
      <div
        ref={mapElementRef}
        className={styles.mapCanvas}
        aria-label="부산광역시 강서구 올바름 본사 위치 지도"
        data-testid="homepage-contact-map"
        role="region"
      />
      {status ? (
        <p className={styles.mapStatus} aria-live="polite">
          {status}
        </p>
      ) : null}
    </div>
  );
}

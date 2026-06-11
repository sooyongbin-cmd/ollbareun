"use client";

import { useEffect, useState } from "react";
import AlertModal from "@/components/modals/alert-modal";
import {
  notifyLocationPermissionGranted,
  queryGeolocationPermission,
  type GeolocationPermissionState,
} from "./location-permission";

const geolocationOptions: PositionOptions = { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 };

function getDialogCopy(permissionState: GeolocationPermissionState) {
  if (permissionState === "denied") {
    return {
      description: "Chrome 사이트 설정에서 위치 권한을 허용한 뒤 다시 시도해주세요.",
      buttonLabel: "확인",
    };
  }

  if (permissionState === "unsupported") {
    return {
      description: "이 브라우저에서는 위치 확인을 사용할 수 없습니다.",
      buttonLabel: "확인",
    };
  }

  return {
    description: "출퇴근 처리를 위해 현재 위치 권한을 허용해주세요.",
    buttonLabel: "위치 허용하기",
  };
}

export default function GuardLocationPermissionPrompt() {
  const [permissionState, setPermissionState] = useState<GeolocationPermissionState | null>(null);

  useEffect(() => {
    let isMounted = true;

    queryGeolocationPermission().then((state) => {
      if (!isMounted) {
        return;
      }

      setPermissionState(state === "granted" ? null : state);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!permissionState) {
    return null;
  }

  const dialogCopy = getDialogCopy(permissionState);

  function handleClose() {
    if (permissionState !== "prompt" || !navigator.geolocation) {
      setPermissionState(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setPermissionState(null);
        notifyLocationPermissionGranted();
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState("denied");
          return;
        }

        setPermissionState(null);
      },
      geolocationOptions,
    );
  }

  return (
    <AlertModal
      isOpen
      onClose={handleClose}
      title="위치 권한이 필요합니다"
      description={dialogCopy.description}
      buttonLabel={dialogCopy.buttonLabel}
    />
  );
}

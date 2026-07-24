"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GuardNoticeDialog } from "@/components/guard/guard-notice-dialog";
import { GuardActionButton } from "@/components/guard/guard-action-button";
import {
  notifyLocationPermissionGranted,
  queryGeolocationPermission,
  type GeolocationPermissionState,
} from "./location-permission";

type GuardLocationGateLinkProps = {
  children: React.ReactNode;
  href: string;
  hasAssignedWorksite?: boolean;
  icon?: React.ReactNode;
};

const geolocationOptions: PositionOptions = { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 };

function getBlockedDescription(permissionState: GeolocationPermissionState) {
  if (permissionState === "unsupported") {
    return "이 브라우저에서는 위치 확인을 사용할 수 없습니다.";
  }

  return "설정에서 위치 권한을 허용한 뒤 다시 시도해주세요.";
}

function requestCurrentPosition() {
  return new Promise<void>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => resolve(),
      reject,
      geolocationOptions,
    );
  });
}

export default function GuardLocationGateLink({ children, href, hasAssignedWorksite = true, icon }: GuardLocationGateLinkProps) {
  const router = useRouter();
  const [blockedState, setBlockedState] = useState<GeolocationPermissionState | null>(null);
  const [isMissingWorksite, setIsMissingWorksite] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  async function handleClick() {
    if (isChecking) {
      return;
    }

    if (!hasAssignedWorksite) {
      setIsMissingWorksite(true);
      return;
    }

    setIsChecking(true);
    try {
      const permissionState = await queryGeolocationPermission();

      if (permissionState === "granted") {
        router.push(href);
        return;
      }

      if (permissionState === "prompt") {
        try {
          await requestCurrentPosition();
          notifyLocationPermissionGranted();
          router.push(href);
        } catch {
          setBlockedState("denied");
        }
        return;
      }

      setBlockedState(permissionState);
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <>
      <GuardActionButton
        variant="outline"
        isLoading={isChecking}
        loadingText="위치 권한 확인 중..."
        onClick={handleClick}
        icon={icon}
      >
        {children}
      </GuardActionButton>

      <GuardNoticeDialog
        open={blockedState !== null}
        onOpenChange={(open) => {
          if (!open) setBlockedState(null);
        }}
        title="위치 권한이 필요합니다"
        description={blockedState ? getBlockedDescription(blockedState) : ""}
        onConfirm={() => setBlockedState(null)}
      />

      <GuardNoticeDialog
        open={isMissingWorksite}
        onOpenChange={(open) => {
          if (!open) setIsMissingWorksite(false);
        }}
        title="배정된 근무지가 없습니다"
        description="관리자에게 근무지 배정을 요청한 뒤 다시 시도해주세요."
        onConfirm={() => setIsMissingWorksite(false)}
      />
    </>
  );
}

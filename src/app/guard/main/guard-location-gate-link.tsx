"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import {
  notifyLocationPermissionGranted,
  queryGeolocationPermission,
  type GeolocationPermissionState,
} from "./location-permission";

type GuardLocationGateLinkProps = {
  children: React.ReactNode;
  href: string;
  hasAssignedWorksite?: boolean;
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

export default function GuardLocationGateLink({ children, href, hasAssignedWorksite = true }: GuardLocationGateLinkProps) {
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
      <Button
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-full justify-center"
        disabled={isChecking}
        onClick={handleClick}
        type="button"
      >
        {children}
      </Button>
      <AlertModal
        isOpen={blockedState !== null}
        onClose={() => setBlockedState(null)}
        title="위치 권한이 필요합니다"
        description={blockedState ? getBlockedDescription(blockedState) : ""}
        buttonLabel="확인"
      />
      <AlertModal
        isOpen={isMissingWorksite}
        onClose={() => setIsMissingWorksite(false)}
        title="배정된 근무지가 없습니다"
        description="관리자에게 근무지 배정을 요청한 뒤 다시 시도해주세요."
        buttonLabel="확인"
      />
    </>
  );
}

"use client";

import { X } from "lucide-react";
import { openGuardInDefaultBrowser } from "./in-app-browser";
import { GuardStatusAlert } from "@/components/guard/guard-status-alert";
import { GuardActionButton } from "@/components/guard/guard-action-button";
import { Button } from "@/components/ui/button";

type InAppBrowserGuideProps = {
  variant?: "inline" | "popup";
  onDismiss?: () => void;
};

export default function InAppBrowserGuide({ variant = "inline", onDismiss }: InAppBrowserGuideProps) {
  const isPopup = variant === "popup";

  return (
    <div className={isPopup ? "relative w-full" : "w-full"}>
      {onDismiss && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="absolute top-2 right-2 size-8 z-10"
          aria-label="알림 닫기"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <GuardStatusAlert
        status="warning"
        title="기본 브라우저로 열기 안내"
        description={
          <div className="space-y-3">
            <p>홈 화면에 추가(앱 설치)하려면 크롬이나 사파리 같은 기본 브라우저가 필요합니다!</p>
            <GuardActionButton
              onClick={openGuardInDefaultBrowser}
              variant="outline"
              className="bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-100 min-h-[44px]"
            >
              기본 브라우저로 열기
            </GuardActionButton>
          </div>
        }
      />
    </div>
  );
}

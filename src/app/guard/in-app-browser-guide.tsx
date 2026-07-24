"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { openGuardInDefaultBrowser } from "./in-app-browser";

type InAppBrowserGuideProps = {
  variant?: "inline" | "popup";
  onDismiss?: () => void;
};

export default function InAppBrowserGuide({ variant = "inline", onDismiss }: InAppBrowserGuideProps) {
  const isPopup = variant === "popup";

  return (
    <div
      className={
        isPopup
          ? "mx-auto flex w-full max-w-[600px] flex-col gap-3 rounded-xl border border-border bg-muted p-5 shadow-lg relative animate-in fade-in slide-in-from-bottom-5 duration-300"
          : "w-full rounded-xl border border-border bg-muted p-6 shadow-lg"
      }
    >
      {onDismiss && (
        <Button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label="알림 닫기"
          size="icon"
          variant="ghost"
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary text-white">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className={isPopup ? "min-w-0 flex-1 pr-6" : "min-w-0 flex-1"}>
          <h2 id="in-app-browser-title" className="text-[16px] font-bold text-foreground leading-6">
            기본 브라우저로 열기 안내
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-muted-foreground leading-snug">
            홈 화면에 추가(앱 설치)하려면 크롬이나 사파리 같은 기본 브라우저가 필요합니다!
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <Button
          type="button"
          onClick={openGuardInDefaultBrowser}
          className="w-full rounded-[12px] bg-primary hover:bg-primary/90 text-white font-bold text-[14px] py-2.5 transition-colors shadow-sm"
        >
          기본 브라우저로 열기
        </Button>
      </div>
    </div>
  );
}

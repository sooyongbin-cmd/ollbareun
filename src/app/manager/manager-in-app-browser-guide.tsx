"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { openInDefaultBrowser } from "@/lib/in-app-browser";

type ManagerInAppBrowserGuideProps = {
  variant?: "inline" | "popup";
  onDismiss?: () => void;
};

function getCurrentManagerPath() {
  if (typeof window === "undefined") return "/manager/auth";
  const path = window.location.pathname;
  if (path.startsWith("/manager")) {
    return path + window.location.search;
  }
  return "/manager/auth";
}

export default function ManagerInAppBrowserGuide({ variant = "inline", onDismiss }: ManagerInAppBrowserGuideProps) {
  const isPopup = variant === "popup";

  const handleOpen = () => {
    void openInDefaultBrowser(getCurrentManagerPath());
  };

  return (
    <div
      className={
        isPopup
          ? "mx-auto flex w-full max-w-[37.5rem] flex-col gap-3 rounded-xl border border-border bg-muted p-5 shadow-lg relative animate-in fade-in slide-in-from-bottom-5 duration-300"
          : "w-full rounded-xl border border-border bg-muted p-6 shadow-lg"
      }
    >
      {onDismiss && (
        <Button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="알림 닫기"
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-primary text-white">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className={isPopup ? "min-w-0 flex-1 pr-6" : "min-w-0 flex-1"}>
          <h2 id="manager-in-app-browser-title" className="text-[1rem] font-bold text-foreground leading-6">
            기본 브라우저로 열기 안내
          </h2>
          <p className="mt-1 text-[0.8125rem] font-semibold text-muted-foreground leading-snug">
            관리자 화면은 기본 브라우저 또는 홈 화면 아이콘에서 사용해 주세요.
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <Button
          type="button"
          onClick={handleOpen}
          className="w-full rounded-[0.75rem] bg-primary hover:bg-primary/90 text-white font-bold text-[0.875rem] py-2.5 transition-colors shadow-sm"
        >
          기본 브라우저로 열기
        </Button>
      </div>
    </div>
  );
}

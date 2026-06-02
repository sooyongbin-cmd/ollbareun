"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { isCurrentInAppBrowser } from "./in-app-browser";

export default function InAppBrowserChecker() {
  const [isInApp, setIsInApp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isCurrentInAppBrowser()) {
      // Defer state update to avoid synchronous setState inside useEffect warning
      const timer = setTimeout(() => {
        setIsInApp(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isInApp || dismissed) {
    return null;
  }

  const handleOpenDefaultBrowser = async () => {
    const targetUrl = window.location.origin + "/guard";
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("android")) {
      const urlWithoutProtocol = targetUrl.replace(/https?:\/\//i, "");
      window.location.href = `intent://${urlWithoutProtocol}#Intent;scheme=https;end`;
    } else if (ua.includes("iphone") || ua.includes("ipad")) {
      if (ua.includes("kakaotalk")) {
        window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(targetUrl)}`;
      } else {
        // iOS Naver or other in-app browsers
        try {
          await navigator.clipboard.writeText(targetUrl);
          alert("링크가 클립보드에 복사되었습니다.\nSafari 브라우저를 열고 주소창에 붙여넣어 접속해 주세요.");
        } catch {
          alert(`아래 주소를 복사하여 Safari 브라우저에 붙여넣어 주세요:\n\n${targetUrl}`);
        }
      }
    } else {
      window.open(targetUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[110] px-4 pb-4 sm:pb-6" role="dialog" aria-labelledby="in-app-browser-title">
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-3 rounded-[18px] border border-amber-500/20 bg-[#fffbeb] p-5 shadow-product relative animate-in fade-in slide-in-from-bottom-5 duration-300">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 text-amber-700/60 hover:text-amber-900 transition-colors p-1"
          aria-label="알림 닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-amber-500 text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <h2 id="in-app-browser-title" className="text-[16px] font-bold text-amber-900 leading-6">
              기본 브라우저로 열기 안내
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-amber-800 leading-snug">
              홈 화면에 추가(앱 설치)하려면 크롬이나 사파리 같은 기본 브라우저가 필요합니다!
            </p>
          </div>
        </div>

        <div className="border-t border-amber-500/10 pt-3">
          <button
            type="button"
            onClick={handleOpenDefaultBrowser}
            className="w-full rounded-[12px] bg-amber-600 hover:bg-amber-700 text-white font-bold text-[14px] py-2.5 transition-colors shadow-sm"
          >
            기본 브라우저로 열기
          </button>
        </div>
      </div>
    </div>
  );
}

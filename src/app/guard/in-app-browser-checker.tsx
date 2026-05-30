"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle } from "lucide-react";

export default function InAppBrowserChecker() {
  const [isInApp, setIsInApp] = useState(false);
  const [os, setOs] = useState<"android" | "ios" | "unknown">("unknown");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isKakao = ua.includes("kakaotalk");
    const isNaver = ua.includes("naver");

    if (isKakao || isNaver) {
      // Defer state update to avoid synchronous setState inside useEffect warning
      const timer = setTimeout(() => {
        setIsInApp(true);
        if (ua.includes("android")) {
          setOs("android");
        } else if (ua.includes("iphone") || ua.includes("ipad")) {
          setOs("ios");
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isInApp || dismissed) {
    return null;
  }

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

        <div className="border-t border-amber-500/10 pt-3 text-[13px] text-amber-700 leading-relaxed">
          {os === "android" ? (
            <p>
              우측 상단의 <strong>더보기(점 3개)</strong> 버튼을 누르고 <br className="hidden sm:inline" />
              <strong>&apos;다른 브라우저로 열기&apos;</strong> 또는 <strong>&apos;Chrome으로 열기&apos;</strong>를 선택해 주세요.
            </p>
          ) : (
            <p>
              우측 하단의 <strong>내보내기(공유)</strong> 또는 <strong>나침반</strong> 아이콘을 누르고 <br className="hidden sm:inline" />
              <strong>&apos;Safari로 열기&apos;</strong>를 선택해 주세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

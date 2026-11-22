"use client";

import { useSyncExternalStore } from "react";
import { isCurrentGuardInstallBrowser, isStandaloneGuardApp } from "./in-app-browser";

function subscribe() {
  return () => {};
}

function shouldShowNotice() {
  return !isStandaloneGuardApp() && !isCurrentGuardInstallBrowser();
}

function getChromePlatform() {
  const { userAgent, platform, maxTouchPoints } = navigator;
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)) return "ios";
  return null;
}

function openCurrentPageInChrome() {
  const { href, protocol } = window.location;
  if (protocol !== "https:" && protocol !== "http:") return;

  const platform = getChromePlatform();
  const address = href.slice(protocol.length + 2);
  if (platform === "android") {
    window.location.href = `intent://${address}#Intent;scheme=${protocol.slice(0, -1)};package=com.android.chrome;end`;
  } else if (platform === "ios") {
    const scheme = protocol === "https:" ? "googlechromes" : "googlechrome";
    window.location.href = `${scheme}://${address}`;
  }
}

export default function InAppBrowserChecker() {
  const showNotice = useSyncExternalStore(subscribe, shouldShowNotice, () => false);
  if (!showNotice) return null;

  return (
    <div className="h-10">
      <div className="fixed inset-x-0 top-0 z-[120] flex h-10 items-center justify-center gap-2 whitespace-nowrap bg-[#ff0000] px-1.5 text-xs font-bold text-[#ffff00] sm:text-sm">
        <span>크롬브라우져에서 실행해주세요.</span>
        {getChromePlatform() && (
          <button type="button" onClick={openCurrentPageInChrome} className="h-8 rounded border border-current px-2 text-inherit focus-visible:outline focus-visible:outline-2">
            Chrome에서 열기
          </button>
        )}
      </div>
    </div>
  );
}

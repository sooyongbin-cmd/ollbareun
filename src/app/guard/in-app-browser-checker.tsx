"use client";

import { useSyncExternalStore } from "react";
import { isCurrentGuardChrome, isStandaloneGuardApp } from "./in-app-browser";

function subscribe() {
  return () => {};
}

function shouldShowNotice() {
  return !isStandaloneGuardApp() && !isCurrentGuardChrome();
}

export default function InAppBrowserChecker() {
  const showNotice = useSyncExternalStore(subscribe, shouldShowNotice, () => false);
  if (!showNotice) return null;

  return (
    <div className="h-8">
      <p className="fixed inset-x-0 top-0 z-[120] m-0 flex h-8 items-center justify-center whitespace-nowrap bg-[#ff0000] px-2 text-sm font-bold text-[#ffff00]">
        크롬브라우져에서 실행해주세요.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { isCurrentInAppBrowser } from "./in-app-browser";
import InAppBrowserGuide from "./in-app-browser-guide";

export default function InAppBrowserChecker() {
  const [isInApp, setIsInApp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.location.pathname === "/guard") {
      return;
    }

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

  return (
    <div className="fixed inset-x-0 bottom-0 z-[110] px-4 pb-4 sm:pb-6" role="dialog" aria-labelledby="in-app-browser-title">
      <InAppBrowserGuide variant="popup" onDismiss={() => setDismissed(true)} />
    </div>
  );
}

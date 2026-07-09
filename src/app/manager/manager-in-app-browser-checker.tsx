"use client";

import { useEffect, useState } from "react";
import { isCurrentInAppBrowser } from "@/lib/in-app-browser";
import ManagerInAppBrowserGuide from "./manager-in-app-browser-guide";

export default function ManagerInAppBrowserChecker() {
  const [isInApp, setIsInApp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isCurrentInAppBrowser()) {
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
    <div className="fixed inset-x-0 bottom-0 z-[110] px-4 pb-4 sm:pb-6" role="dialog" aria-labelledby="manager-in-app-browser-title">
      <ManagerInAppBrowserGuide variant="popup" onDismiss={() => setDismissed(true)} />
    </div>
  );
}

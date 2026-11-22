import {
  isInAppBrowserUserAgent,
  isCurrentInAppBrowser,
  isStandaloneApp,
  openInDefaultBrowser,
} from "@/lib/in-app-browser";

export { isInAppBrowserUserAgent, isCurrentInAppBrowser };

export function isStandaloneGuardApp() {
  // TWA referrer identifies the launch surface, never an authentication decision.
  const isWorkerTwa = typeof document !== "undefined"
    && document.referrer === "android-app://com.olbareum.worker";
  return isStandaloneApp() || isWorkerTwa;
}

export async function openGuardInDefaultBrowser() {
  return openInDefaultBrowser("/guard");
}

export function isCurrentGuardInstallBrowser() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  return /\b(?:Chrome|CriOS|Edg(?:A|iOS)?|SamsungBrowser)\//i.test(ua)
    && !/\b(?:OPR|Opera|Vivaldi|YaBrowser|Whale|DuckDuckGo|Brave)\//i.test(ua)
    && !/;\s*wv\b/i.test(ua)
    && !isCurrentInAppBrowser();
}

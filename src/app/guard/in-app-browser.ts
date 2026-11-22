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

export function isCurrentGuardChrome() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  return /\b(?:Chrome|CriOS)\//i.test(ua)
    && !/\b(?:SamsungBrowser|Edg(?:A|iOS)?|OPR|Opera|Vivaldi|YaBrowser|Whale|DuckDuckGo|Brave)\//i.test(ua)
    && !/;\s*wv\b/i.test(ua)
    && !isCurrentInAppBrowser();
}

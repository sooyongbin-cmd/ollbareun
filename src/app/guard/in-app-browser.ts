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

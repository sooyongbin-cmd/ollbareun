import {
  isInAppBrowserUserAgent,
  isCurrentInAppBrowser,
  isStandaloneApp,
  openInDefaultBrowser,
} from "@/lib/in-app-browser";

export { isInAppBrowserUserAgent, isCurrentInAppBrowser };

export function isStandaloneGuardApp() {
  return isStandaloneApp();
}

export async function openGuardInDefaultBrowser() {
  return openInDefaultBrowser("/guard");
}

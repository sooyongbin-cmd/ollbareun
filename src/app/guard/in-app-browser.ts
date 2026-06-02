export function isInAppBrowserUserAgent(userAgent: string) {
  const normalizedUserAgent = userAgent.toLowerCase();
  return normalizedUserAgent.includes("kakaotalk") || normalizedUserAgent.includes("naver");
}

export function isCurrentInAppBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return isInAppBrowserUserAgent(navigator.userAgent);
}

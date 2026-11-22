undefined
export function isCurrentGuardChrome() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  return /\b(?:Chrome|CriOS)\//i.test(ua)
    && !/\b(?:SamsungBrowser|Edg(?:A|iOS)?|OPR|Opera|Vivaldi|YaBrowser|Whale|DuckDuckGo|Brave)\//i.test(ua)
    && !/;\s*wv\b/i.test(ua)
    && !isCurrentInAppBrowser();
}

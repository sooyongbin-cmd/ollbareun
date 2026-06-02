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

export async function openGuardInDefaultBrowser() {
  const targetUrl = window.location.origin + "/guard";
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("android")) {
    const urlWithoutProtocol = targetUrl.replace(/https?:\/\//i, "");
    window.location.href = `intent://${urlWithoutProtocol}#Intent;scheme=https;end`;
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    if (ua.includes("kakaotalk")) {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(targetUrl)}`;
    } else {
      try {
        await navigator.clipboard.writeText(targetUrl);
        alert("링크가 클립보드에 복사되었습니다.\nSafari 브라우저를 열고 주소창에 붙여넣어 접속해 주세요.");
      } catch {
        alert(`아래 주소를 복사하여 Safari 브라우저에 붙여넣어 주세요:\n\n${targetUrl}`);
      }
    }
  } else {
    window.open(targetUrl, "_blank");
  }
}

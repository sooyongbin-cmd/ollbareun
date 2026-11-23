"use client";

import { useSyncExternalStore } from "react";

const browsers = [
  ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
  ["Edge", /(?:EdgA|EdgiOS|Edg|Edge)\/([\d.]+)/],
  ["Opera", /(?:OPR|OPiOS)\/([\d.]+)/],
  ["Firefox", /(?:FxiOS|Firefox)\/([\d.]+)/],
  ["Chrome", /(?:CriOS|Chrome|Chromium)\/([\d.]+)/],
  ["Safari", /Version\/([\d.]+).*Safari\//],
] as const;

function subscribe() {
  return () => {};
}

function getBrowserInfo() {
  const { userAgent, platform, maxTouchPoints } = navigator;
  const appleMobileVersion = userAgent.match(/\b(?:CPU (?:iPhone )?OS|iPhone OS) ([\d_]+)/)?.[1].replaceAll("_", ".");
  const androidVersion = userAgent.match(/\bAndroid ([\d.]+)/)?.[1];
  const macVersion = userAgent.match(/\bMac OS X ([\d_.]+)/)?.[1].replaceAll("_", ".");

  let os = "OS 확인 불가";
  if (/iPad/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)) {
    os = appleMobileVersion ? `iPadOS ${appleMobileVersion}` : "iPadOS";
  } else if (/iPhone|iPod/i.test(userAgent)) {
    os = appleMobileVersion ? `iOS ${appleMobileVersion}` : "iOS";
  } else if (/Android/i.test(userAgent)) {
    os = androidVersion ? `Android ${androidVersion}` : "Android";
  } else if (/Windows/i.test(userAgent)) {
    os = "Windows";
  } else if (/Macintosh/i.test(userAgent)) {
    os = macVersion ? `macOS ${macVersion}` : "macOS";
  } else if (/CrOS/i.test(userAgent)) {
    os = "ChromeOS";
  } else if (/Linux/i.test(userAgent)) {
    os = "Linux";
  }

  for (const [name, pattern] of browsers) {
    const version = userAgent.match(pattern)?.[1];
    if (version) return `${os} (${name} ${version})`;
  }

  return `${os} (브라우저 확인 불가)`;
}

function getServerSnapshot() {
  return "";
}

export default function GuardBrowserInfo() {
  const info = useSyncExternalStore(subscribe, getBrowserInfo, getServerSnapshot);

  return <footer className="px-4 py-4 text-center text-[10px] text-muted-foreground">{info}</footer>;
}

"use client";

import { useEffect, useState } from "react";
import { educationChangedEvent, educationToday } from "./education-periods";

/** Refresh after attendance/completion, returning to this tab, and exactly at KST midnight. */
export function useEducationRefresh() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => setVersion((value) => value + 1);
    const scheduleMidnight = () => {
      const nextMidnight = Date.parse(`${educationToday()}T00:00:00+09:00`) + 86400000;
      timer = setTimeout(() => { refresh(); scheduleMidnight(); }, Math.max(nextMidnight - Date.now(), 1));
    };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    scheduleMidnight();
    window.addEventListener(educationChangedEvent, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(educationChangedEvent, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  return version;
}

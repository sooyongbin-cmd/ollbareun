"use client";

import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import {
  getGuardFontZoomPercent,
  getGuardFontZoomScale,
  getGuardZoomPercent,
  getGuardZoomScale,
  subscribeToGuardFontZoomChange,
  subscribeToGuardZoomChange,
} from "./guard-zoom";

export default function GuardZoomScope({
  children,
}: {
  children: React.ReactNode;
}) {
  const zoomPercent = useSyncExternalStore(
    subscribeToGuardZoomChange,
    getGuardZoomPercent,
    () => 100,
  );
  const fontZoomPercent = useSyncExternalStore(
    subscribeToGuardFontZoomChange,
    getGuardFontZoomPercent,
    () => 100,
  );
  const style = {
    "--guard-zoom-scale": String(getGuardZoomScale(zoomPercent)),
    "--guard-font-scale": String(getGuardFontZoomScale(fontZoomPercent)),
  } as CSSProperties;

  return (
    <div className="guard-zoom-scope guard-font-scale" data-testid="guard-zoom-scope" style={style}>
      {children}
    </div>
  );
}

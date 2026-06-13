"use client";

import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import {
  getGuardZoomPercent,
  getGuardZoomScale,
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
  const style = {
    "--guard-zoom-scale": String(getGuardZoomScale(zoomPercent)),
  } as CSSProperties;

  return (
    <div className="guard-zoom-scope guard-font-scale" data-testid="guard-zoom-scope" style={style}>
      {children}
    </div>
  );
}

export const guardZoomStorageKey = "ollbareun.guard.zoomPercent";

const guardZoomChangedEvent = "ollbareun.guard.zoom.changed";
const defaultGuardZoomPercent = 100;
const guardZoomSteps = [80, 90, 100, 110, 125, 150, 175, 200] as const;

export type GuardZoomPercent = (typeof guardZoomSteps)[number];

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeGuardZoomPercent(value: unknown): GuardZoomPercent {
  const numericValue = typeof value === "number" ? value : Number(value);
  return guardZoomSteps.includes(numericValue as GuardZoomPercent)
    ? (numericValue as GuardZoomPercent)
    : defaultGuardZoomPercent;
}

function getStepIndex(zoomPercent: number) {
  const normalized = normalizeGuardZoomPercent(zoomPercent);
  return guardZoomSteps.indexOf(normalized);
}

export function getGuardZoomPercent(): GuardZoomPercent {
  if (!isBrowser()) {
    return defaultGuardZoomPercent;
  }

  try {
    return normalizeGuardZoomPercent(window.localStorage.getItem(guardZoomStorageKey));
  } catch {
    return defaultGuardZoomPercent;
  }
}

export function setGuardZoomPercent(zoomPercent: number) {
  if (!isBrowser()) {
    return;
  }

  const normalized = normalizeGuardZoomPercent(zoomPercent);

  try {
    window.localStorage.setItem(guardZoomStorageKey, String(normalized));
  } catch {
    // Keep the control usable when storage is unavailable.
  }

  window.dispatchEvent(new Event(guardZoomChangedEvent));
}

export function increaseGuardZoomPercent(zoomPercent: number): GuardZoomPercent {
  const index = getStepIndex(zoomPercent);
  return guardZoomSteps[Math.min(index + 1, guardZoomSteps.length - 1)];
}

export function decreaseGuardZoomPercent(zoomPercent: number): GuardZoomPercent {
  const index = getStepIndex(zoomPercent);
  return guardZoomSteps[Math.max(index - 1, 0)];
}

export function getGuardZoomScale(zoomPercent: number) {
  return normalizeGuardZoomPercent(zoomPercent) / 100;
}

export function subscribeToGuardZoomChange(onStoreChange: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === guardZoomStorageKey) {
      onStoreChange();
    }
  }

  window.addEventListener(guardZoomChangedEvent, onStoreChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(guardZoomChangedEvent, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

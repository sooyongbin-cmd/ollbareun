"use client";

export const locationPermissionGrantedEvent = "ollbareun:location-permission-granted";

export type GeolocationPermissionState = PermissionState | "unsupported";

export async function queryGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return "unsupported";
  }

  if (!navigator.permissions?.query) {
    return "granted";
  }

  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state;
  } catch {
    return "prompt";
  }
}

export function notifyLocationPermissionGranted() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(locationPermissionGrantedEvent));
}

export type GpsInfo = {
  latitude: number;
  longitude: number;
};

export function isGpsInfo(value: unknown): value is GpsInfo {
  if (!value || typeof value !== "object") {
    return false;
  }

  const gps = value as Partial<GpsInfo>;
  return Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude);
}

export function formatGpsInfo(gps: GpsInfo | null | undefined) {
  return gps ? `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}` : "";
}

export function parseGpsInfo(value: unknown): GpsInfo | null {
  if (isGpsInfo(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const [latitudeText, longitudeText] = value.split(",").map((part) => part.trim());
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export function requireGpsInfo(value: unknown, label = "GPS정보"): GpsInfo {
  const gps = parseGpsInfo(value);

  if (!gps) {
    throw new Error(`${label} 값이 올바르지 않습니다.`);
  }

  if (gps.latitude < -90 || gps.latitude > 90 || gps.longitude < -180 || gps.longitude > 180) {
    throw new Error(`${label} 값이 허용 범위를 벗어났습니다.`);
  }

  return gps;
}

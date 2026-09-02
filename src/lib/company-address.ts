export const DEFAULT_COMPANY_ADDRESS = "부산광역시 강서구 유통단지1로 41, 105동 217・218호";

export type CompanyMapCoordinates = {
  latitude: number;
  longitude: number;
};

export const DEFAULT_COMPANY_MAP_COORDINATES: CompanyMapCoordinates = {
  latitude: 35.1673384631299,
  longitude: 128.955819688911,
};

export function normalizeCompanyAddress(value: unknown, fallback = DEFAULT_COMPANY_ADDRESS) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function parseCompanyMapCoordinates(value: unknown): CompanyMapCoordinates | null {
  if (typeof value !== "string") {
    return null;
  }

  const values = value.match(/[-+]?(?:\d+(?:\.\d+)?|\.\d+)/g)?.slice(0, 2).map(Number);

  if (!values || values.length < 2 || values.some((coordinate) => !Number.isFinite(coordinate))) {
    return null;
  }

  const [first, second] = values;
  const latitude = Math.abs(first) > 90 && Math.abs(second) <= 90 ? second : first;
  const longitude = Math.abs(first) > 90 && Math.abs(second) <= 90 ? first : second;

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { latitude, longitude };
}

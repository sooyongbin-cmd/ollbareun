export const DEFAULT_COMPANY_ADDRESS = "부산광역시 강서구 유통단지1로 41, 105동 217・218호";

export function normalizeCompanyAddress(value: unknown, fallback = DEFAULT_COMPANY_ADDRESS) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

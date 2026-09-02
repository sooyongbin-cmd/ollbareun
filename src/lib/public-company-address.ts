import { getSystemConfigContent } from "./system-configs";
import {
  DEFAULT_COMPANY_ADDRESS,
  DEFAULT_COMPANY_MAP_COORDINATES,
  normalizeCompanyAddress,
  parseCompanyMapCoordinates,
} from "./company-address";

export async function getPublicCompanyAddress() {
  try {
    return normalizeCompanyAddress(await getSystemConfigContent("code_address"));
  } catch {
    return DEFAULT_COMPANY_ADDRESS;
  }
}

export async function getPublicMapCoordinates() {
  try {
    return parseCompanyMapCoordinates(await getSystemConfigContent("code_map_address")) ?? DEFAULT_COMPANY_MAP_COORDINATES;
  } catch {
    return DEFAULT_COMPANY_MAP_COORDINATES;
  }
}

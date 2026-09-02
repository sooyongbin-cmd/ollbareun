import { getSystemConfigContent } from "./system-configs";
import { DEFAULT_COMPANY_ADDRESS, normalizeCompanyAddress } from "./company-address";

export async function getPublicCompanyAddress() {
  try {
    return normalizeCompanyAddress(await getSystemConfigContent("code_address"));
  } catch {
    return DEFAULT_COMPANY_ADDRESS;
  }
}

export async function getPublicMapAddress(fallbackAddress = DEFAULT_COMPANY_ADDRESS) {
  const fallback = normalizeCompanyAddress(fallbackAddress);

  try {
    return normalizeCompanyAddress(
      await getSystemConfigContent("code_map_address"),
      fallback,
    );
  } catch {
    return fallback;
  }
}

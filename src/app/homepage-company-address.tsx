"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_COMPANY_ADDRESS, normalizeCompanyAddress } from "@/lib/company-address";

const HomepageCompanyAddressContext = createContext(DEFAULT_COMPANY_ADDRESS);
const HomepageMapAddressContext = createContext(DEFAULT_COMPANY_ADDRESS);

export function HomepageCompanyAddressProvider({
  companyAddress,
  mapAddress,
  children,
}: {
  companyAddress: string;
  mapAddress?: string;
  children: ReactNode;
}) {
  const normalizedCompanyAddress = normalizeCompanyAddress(companyAddress);
  const normalizedMapAddress = normalizeCompanyAddress(
    mapAddress?.trim() ? mapAddress : normalizedCompanyAddress,
  );

  return (
    <HomepageCompanyAddressContext.Provider value={normalizedCompanyAddress}>
      <HomepageMapAddressContext.Provider value={normalizedMapAddress}>
        {children}
      </HomepageMapAddressContext.Provider>
    </HomepageCompanyAddressContext.Provider>
  );
}

export function useHomepageCompanyAddress() {
  return useContext(HomepageCompanyAddressContext);
}

export function useHomepageMapAddress() {
  return useContext(HomepageMapAddressContext);
}

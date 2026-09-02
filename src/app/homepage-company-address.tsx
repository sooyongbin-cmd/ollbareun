"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_COMPANY_ADDRESS, normalizeCompanyAddress } from "@/lib/company-address";

const HomepageCompanyAddressContext = createContext(DEFAULT_COMPANY_ADDRESS);

export function HomepageCompanyAddressProvider({
  companyAddress,
  children,
}: {
  companyAddress: string;
  children: ReactNode;
}) {
  return (
    <HomepageCompanyAddressContext.Provider value={normalizeCompanyAddress(companyAddress)}>
      {children}
    </HomepageCompanyAddressContext.Provider>
  );
}

export function useHomepageCompanyAddress() {
  return useContext(HomepageCompanyAddressContext);
}

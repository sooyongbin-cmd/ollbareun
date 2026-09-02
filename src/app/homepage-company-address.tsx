"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  DEFAULT_COMPANY_ADDRESS,
  DEFAULT_COMPANY_MAP_COORDINATES,
  normalizeCompanyAddress,
  type CompanyMapCoordinates,
} from "@/lib/company-address";

const HomepageCompanyAddressContext = createContext(DEFAULT_COMPANY_ADDRESS);
const HomepageMapCoordinatesContext = createContext(DEFAULT_COMPANY_MAP_COORDINATES);

export function HomepageCompanyAddressProvider({
  companyAddress,
  mapCoordinates,
  children,
}: {
  companyAddress: string;
  mapCoordinates?: CompanyMapCoordinates;
  children: ReactNode;
}) {
  const normalizedCompanyAddress = normalizeCompanyAddress(companyAddress);
  const normalizedMapCoordinates = mapCoordinates ?? DEFAULT_COMPANY_MAP_COORDINATES;

  return (
    <HomepageCompanyAddressContext.Provider value={normalizedCompanyAddress}>
      <HomepageMapCoordinatesContext.Provider value={normalizedMapCoordinates}>
        {children}
      </HomepageMapCoordinatesContext.Provider>
    </HomepageCompanyAddressContext.Provider>
  );
}

export function useHomepageCompanyAddress() {
  return useContext(HomepageCompanyAddressContext);
}

export function useHomepageMapCoordinates() {
  return useContext(HomepageMapCoordinatesContext);
}

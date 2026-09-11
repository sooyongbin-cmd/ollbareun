"use client";

import { createContext, useContext } from "react";

// The app's guard and manager layouts always provide the server-resolved value.
// Keep the fallback enabled so these client pages remain independently testable.
const PasskeyFeatureContext = createContext(true);

export function PasskeyFeatureProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return <PasskeyFeatureContext.Provider value={enabled}>{children}</PasskeyFeatureContext.Provider>;
}

export function usePasskeyFeatureEnabled() {
  return useContext(PasskeyFeatureContext);
}

import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  turbopack: {},
};

const config = (phase: string) => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    const withSerwist = withSerwistInit({
      swSrc: "src/app/sw.ts",
      swDest: "public/sw.js",
      disable: false,
    });
    return withSerwist(nextConfig);
  }
  return nextConfig;
};

export default config;

import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/manager/safty/:path*",
        destination: "/manager/safety/:path*",
        permanent: true,
      },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  additionalPrecacheEntries: [{ url: "/offline", revision: "1" }],
});

export default withSerwist(nextConfig);

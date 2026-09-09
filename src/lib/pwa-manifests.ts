import type { MetadataRoute } from "next";

const brandIcons: MetadataRoute.Manifest["icons"] = [
  { src: "/icons/header-logo-color-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/header-logo-color-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icons/header-logo-color-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
  { src: "/icons/header-logo-color-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

export function guardPwaManifest(): MetadataRoute.Manifest {
  return {
    name: "올바름 근무자",
    short_name: "올바름 근무자",
    description: "올바름 현장 근로자 모바일 업무 앱",
    id: "/guard",
    start_url: "/guard",
    scope: "/guard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0066cc",
    icons: brandIcons,
  };
}

export function managerPwaManifest(): MetadataRoute.Manifest {
  return {
    name: "올바름 관리자",
    short_name: "올바름 관리자",
    description: "올바름 현장 관리 앱",
    id: "/manager",
    start_url: "/manager",
    scope: "/manager",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0066cc",
    icons: brandIcons,
  };
}

export function legacyPwaManifest(): MetadataRoute.Manifest {
  return {
    name: "사회적기업 올바름",
    short_name: "사회적기업 올바름",
    description: "올바름 현장 근로자 모바일 업무 앱",
    id: "https://ollbareun.vercel.app/manager",
    start_url: "/guard",
    scope: "/guard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0066cc",
    icons: brandIcons,
  };
}

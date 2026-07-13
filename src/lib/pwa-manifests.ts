import type { MetadataRoute } from "next";

const guardIcons: MetadataRoute.Manifest["icons"] = [
  {
    src: "/guard-icon-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/guard-icon-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/guard-icon-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "maskable",
  },
  {
    src: "/guard-icon-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

const managerIcons: MetadataRoute.Manifest["icons"] = [
  {
    src: "/manager-icon-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/manager-icon-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/manager-icon-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "maskable",
  },
  {
    src: "/manager-icon-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

export function guardPwaManifest(): MetadataRoute.Manifest {
  return {
    name: "올바름 경비원",
    short_name: "올바름 경비원",
    description: "올바름 경비원 모바일 근태 앱",
    id: "/guard",
    start_url: "/guard",
    scope: "/guard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0066cc",
    icons: guardIcons,
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
    theme_color: "#006a62",
    icons: managerIcons,
  };
}

export function legacyPwaManifest(): MetadataRoute.Manifest {
  return {
    name: "사회적기업 올바름",
    short_name: "사회적기업 올바름",
    description: "올바름 경비원 모바일 근태 앱",
    id: "https://ollbareun.vercel.app/manager",
    start_url: "/guard",
    scope: "/guard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0066cc",
    icons: guardIcons,
  };
}

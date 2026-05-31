import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("PWA manifest", () => {
  it("configures the guard app install entry for Android Chrome", () => {
    expect(manifest()).toMatchObject({
      name: "올바른 경비원",
      short_name: "올바른 경비원",
      start_url: "/guard",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      id: "https://ollbareun.vercel.app/manager",
      background_color: "#ffffff",
      theme_color: "#0066cc",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      screenshots: [
        {
          src: "/screenshot.jpg",
          sizes: "1280x720",
          type: "image/jpeg",
          form_factor: "wide",
        },
      ],
    });
  });
});

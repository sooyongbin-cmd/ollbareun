import { legacyPwaManifest } from "@/lib/pwa-manifests";

export function GET() {
  return Response.json(legacyPwaManifest(), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/manifest+json; charset=utf-8",
    },
  });
}

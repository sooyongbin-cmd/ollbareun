import { managerPwaManifest } from "@/lib/pwa-manifests";

export function GET() {
  return Response.json(managerPwaManifest(), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}

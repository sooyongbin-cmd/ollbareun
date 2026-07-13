import { guardPwaManifest } from "@/lib/pwa-manifests";

export function GET() {
  return Response.json(guardPwaManifest(), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}

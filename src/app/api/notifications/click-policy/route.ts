import { isSystemConfigEnabled } from "@/lib/system-configs";

export const dynamic = "force-dynamic";

export async function GET() {
  // A service worker can run without a logged-in page. Expose only this
  // non-sensitive boolean, never the full system configuration list.
  return Response.json(
    { openInNewWindow: await isSystemConfigEnabled("S000002") },
    { headers: { "Cache-Control": "no-store" } },
  );
}

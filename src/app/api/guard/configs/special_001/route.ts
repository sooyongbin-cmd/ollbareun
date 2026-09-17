import { isSystemConfigEnabled } from "@/lib/system-configs";

export async function GET() {
  return Response.json(
    { enabled: await isSystemConfigEnabled("special_001") },
    { headers: { "Cache-Control": "no-store" } },
  );
}

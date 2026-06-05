import { getCloudflareVideoByUid } from "@/lib/cloudflare-stream";

function getCloudflareRouteError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export async function GET(_request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    return Response.json({ video: await getCloudflareVideoByUid(uid) });
  } catch (error) {
    return Response.json(
      { error: getCloudflareRouteError(error, "Cloudflare 동영상을 불러오지 못했습니다.") },
      { status: 500 },
    );
  }
}

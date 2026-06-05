import { listCloudflareVideos } from "@/lib/cloudflare-stream";

function getCloudflareRouteError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export async function GET() {
  try {
    return Response.json({ videos: await listCloudflareVideos() });
  } catch (error) {
    return Response.json(
      { error: getCloudflareRouteError(error, "Cloudflare 동영상 목록을 불러오지 못했습니다.") },
      { status: 500 },
    );
  }
}

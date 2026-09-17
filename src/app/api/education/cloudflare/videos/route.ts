import { listCloudflareVideos } from "@/lib/cloudflare-stream";
import { getManagerUser } from "@/lib/manager-auth";

function getCloudflareRouteError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export async function GET() {
  try {
    if (!await getManagerUser()) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    return Response.json({ videos: await listCloudflareVideos() });
  } catch (error) {
    return Response.json(
      { error: getCloudflareRouteError(error, "Cloudflare 동영상 목록을 불러오지 못했습니다.") },
      { status: 500 },
    );
  }
}

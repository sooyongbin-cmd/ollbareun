import { createCloudflareDirectUpload } from "@/lib/cloudflare-stream";

function getCloudflareRouteError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      fileName?: unknown;
      fileSize?: unknown;
    };

    return Response.json({
      directUpload: await createCloudflareDirectUpload({
        fileName: payload.fileName,
        fileSize: payload.fileSize,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: getCloudflareRouteError(error, "Cloudflare 업로드 URL을 생성하지 못했습니다.") },
      { status: 400 },
    );
  }
}

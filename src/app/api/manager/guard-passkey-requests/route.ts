import { listGuardPasskeyRequests } from "@/lib/guard-passkeys";

export async function GET() {
  try {
    return Response.json({ requests: await listGuardPasskeyRequests() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "패스키 요청 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

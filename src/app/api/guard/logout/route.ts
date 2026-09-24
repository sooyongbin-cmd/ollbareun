import { clearGuardAuthCookie, revokeGuardAuthSession } from "@/lib/guard-auth-session";

export async function POST(request: Request) {
  try {
    await revokeGuardAuthSession(request);
    return Response.json({ success: true }, { headers: { "Set-Cookie": clearGuardAuthCookie() } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "로그아웃 처리에 실패했습니다." },
      { status: 500, headers: { "Set-Cookie": clearGuardAuthCookie() } },
    );
  }
}

import { updateGuardSessionLogoutLog } from "@/lib/guard-session-logs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = body.result ?? null;

    const log = await updateGuardSessionLogoutLog({
      id,
      browserPushStatus: body.browserPushStatus ?? result?.browserSubscription,
      serverPushStatus: body.serverPushStatus ?? result?.serverSubscription,
      sessionStatus: body.sessionStatus ?? result?.session,
      result,
    });

    return Response.json({ log });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "로그아웃 로그 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

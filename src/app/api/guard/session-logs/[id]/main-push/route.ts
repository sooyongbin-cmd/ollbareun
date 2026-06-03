import { updateGuardSessionMainPushLog, type MainPushStatus } from "@/lib/guard-session-logs";

const mainPushStatuses: MainPushStatus[] = ["success", "warning", "error", "skipped"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!mainPushStatuses.includes(body.status)) {
      return Response.json({ error: "유효한 Push 상태가 필요합니다." }, { status: 400 });
    }

    const log = await updateGuardSessionMainPushLog({
      id,
      status: body.status,
      result: body.result ?? null,
    });

    return Response.json({ log });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Push 로그 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

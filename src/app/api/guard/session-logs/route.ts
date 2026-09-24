import { listGuardSessionLogs } from "@/lib/guard-session-logs";
import { getManagerUser } from "@/lib/manager-auth";

export async function GET(request: Request) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const url = new URL(request.url);
    const logs = await listGuardSessionLogs({
      guardName: url.searchParams.get("guardName"),
      loginStatus: url.searchParams.get("loginStatus"),
      pushStatus: url.searchParams.get("pushStatus"),
      limit: 100,
    });

    return Response.json({ logs });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "로그 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

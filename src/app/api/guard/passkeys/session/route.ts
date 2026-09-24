import { createGuardSessionFromAuthToken } from "@/lib/guard-passkeys";
import { createGuardSessionLog } from "@/lib/guard-session-logs";
import { createGuardAuthSession } from "@/lib/guard-auth-session";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const accessToken = authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : "";
    const session = await createGuardSessionFromAuthToken(accessToken);
    const log = await createGuardSessionLog({
      employeeId: session.employee.id,
      guardName: session.employee.name,
      loginStatus: "success",
    });

    const auth = await createGuardAuthSession(session.employee.id);
    return Response.json(
      { ...session, sessionLogId: log?.id ?? null },
      { headers: { "Set-Cookie": auth.setCookie } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "패스키 로그인에 실패했습니다." },
      { status: 401 },
    );
  }
}

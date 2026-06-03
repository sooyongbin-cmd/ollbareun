import { authenticateGuard } from "@/lib/phase1-data";
import { createGuardSessionLog } from "@/lib/guard-session-logs";

export async function POST(request: Request) {
  let body: { name: unknown; phone: unknown } = { name: undefined, phone: undefined };

  try {
    body = await request.json();
    const session = await authenticateGuard(body);
    const log = await createGuardSessionLog({
      employeeId: session.employee.id,
      guardName: session.employee.name,
      loginStatus: "success",
    });

    return Response.json({ ...session, sessionLogId: log.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "경비원 인증에 실패했습니다.";

    try {
      await createGuardSessionLog({
        guardName: body.name,
        loginStatus: "failed",
        loginError: message,
      });
    } catch (logError) {
      console.error("Failed to write guard login failure log:", logError);
    }

    return Response.json(
      { error: message },
      { status: 401 },
    );
  }
}

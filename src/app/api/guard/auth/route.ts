import { authenticateGuard } from "@/lib/phase1-data";
import { createGuardAuthSession } from "@/lib/guard-auth-session";

export async function POST(request: Request) {
  let body: { name: unknown; phone: unknown } = { name: undefined, phone: undefined };

  try {
    body = await request.json();
    const session = await authenticateGuard(body);
    const auth = await createGuardAuthSession(session.employee.id);
    return Response.json(
      session,
      { headers: { "Set-Cookie": auth.setCookie } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "경비원 인증에 실패했습니다.";

    return Response.json(
      { error: message },
      { status: 401 },
    );
  }
}

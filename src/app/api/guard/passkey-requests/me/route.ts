import { loadGuardPasskeyRequestForEmployee } from "@/lib/guard-passkeys";
import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employee = await requireGuardEmployee(request, url.searchParams.get("employeeId"));
    const passkeyRequest = await loadGuardPasskeyRequestForEmployee(employee.id);
    return Response.json({ request: passkeyRequest });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "패스키 요청 상태를 불러오지 못했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}

import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";
import { loadGuardSessionByEmployeeId } from "@/lib/phase1-data";

export async function GET(request: Request) {
  try {
    const employee = await requireGuardEmployee(request);
    const session = await loadGuardSessionByEmployeeId(employee.id);
    return Response.json({ session });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근무자 세션을 확인하지 못했습니다." },
      { status: guardAuthErrorStatus(error) },
    );
  }
}

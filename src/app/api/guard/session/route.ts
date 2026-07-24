import { InactiveEmployeeError, requireActiveEmployee } from "@/lib/active-employee";
import { loadGuardSessionByEmployeeId } from "@/lib/phase1-data";

export async function GET(request: Request) {
  try {
    const employeeId = new URL(request.url).searchParams.get("employeeId");
    await requireActiveEmployee(employeeId);
    const session = await loadGuardSessionByEmployeeId(employeeId);
    return Response.json({ session });
  } catch (error) {
    const status = error instanceof InactiveEmployeeError ? 403 : 500;
    return Response.json(
      { error: error instanceof Error ? error.message : "근무자 세션을 확인하지 못했습니다." },
      { status },
    );
  }
}

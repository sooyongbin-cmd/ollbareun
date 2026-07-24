import { clockOut } from "@/lib/phase1-data";
import { getActiveEmployeeErrorStatus, requireActiveEmployee } from "@/lib/active-employee";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await requireActiveEmployee(body.employeeId);
    return Response.json({ attendance: await clockOut(body) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "퇴근 처리에 실패했습니다." },
      { status: getActiveEmployeeErrorStatus(error, 400) },
    );
  }
}

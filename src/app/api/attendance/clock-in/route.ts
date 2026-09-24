import { clockIn } from "@/lib/phase1-data";
import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employee = await requireGuardEmployee(request, body.employeeId);
    return Response.json({ attendance: await clockIn({ ...body, employeeId: employee.id }) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "출근 처리에 실패했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}

import { listEducationCompletions, markEducationCompletion } from "@/lib/education-completions";
import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";
import { getManagerUser } from "@/lib/manager-auth";

export async function GET(request: Request) {
  try {
    const manager = await getManagerUser();
    if (manager) return Response.json({ completions: await listEducationCompletions() });
    const employee = await requireGuardEmployee(request);
    const completions = await listEducationCompletions();
    return Response.json({ completions: completions.filter((completion) => completion.employee_id === employee.id) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육이수 목록을 불러오지 못했습니다." },
      { status: guardAuthErrorStatus(error) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employee = await requireGuardEmployee(request, body.employeeId);
    return Response.json({
      completion: await markEducationCompletion({
        employeeId: employee.id,
        resourceId: body.resourceId,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육이수 정보를 저장하지 못했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}

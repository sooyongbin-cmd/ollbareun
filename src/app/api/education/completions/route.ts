import { listEducationCompletions, markEducationCompletion } from "@/lib/education-completions";
import { getActiveEmployeeErrorStatus, requireActiveEmployee } from "@/lib/active-employee";

export async function GET() {
  try {
    return Response.json({ completions: await listEducationCompletions() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육이수 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await requireActiveEmployee(body.employeeId);
    return Response.json({
      completion: await markEducationCompletion({
        employeeId: body.employeeId,
        resourceId: body.resourceId,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육이수 정보를 저장하지 못했습니다." },
      { status: getActiveEmployeeErrorStatus(error, 400) },
    );
  }
}

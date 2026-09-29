import { currentEducationStatus, listEducationCompletions, loadEducationDays, loadEducationHistory, markEducationCompletion, resourceCompletionCounts } from "@/lib/education-completions";
import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";
import { getManagerUser } from "@/lib/manager-auth";

export async function GET(request: Request) {
  try {
    const manager = await getManagerUser();
    if (manager && new URL(request.url).searchParams.get("view") !== "current") {
      const params = new URL(request.url).searchParams;
      if (params.get("view") === "days") return Response.json(await loadEducationDays(params));
      if (params.get("view") === "history") return Response.json(await loadEducationHistory(params));
      if (params.get("view") === "resources") return Response.json({ counts: await resourceCompletionCounts() });
      return Response.json({ completions: await listEducationCompletions() });
    }
    const employee = await requireGuardEmployee(request);
    return Response.json({ completions: await currentEducationStatus(employee.id) });
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

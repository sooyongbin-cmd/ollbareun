import { createInspectionLog, listInspectionLogs } from "@/lib/inspection";
import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";
import { getManagerUser } from "@/lib/manager-auth";
import { loadGuardSessionByEmployeeId } from "@/lib/phase1-data";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const worksiteId = url.searchParams.get("worksiteId") ?? "";
    if (!(await getManagerUser())) {
      const employee = await requireGuardEmployee(request);
      const session = await loadGuardSessionByEmployeeId(employee.id);
      if (!session.worksite || (worksiteId && worksiteId !== session.worksite.id)) {
        return Response.json({ error: "배정된 근무지의 점검 내역만 조회할 수 있습니다." }, { status: 403 });
      }
      return Response.json({ logs: await listInspectionLogs({ worksiteId: session.worksite.id }) });
    }
    return Response.json({ logs: await listInspectionLogs({ worksiteId }) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장점검현황을 불러오지 못했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employee = await requireGuardEmployee(request, body.employeeId);
    if (employee.role !== "경비원" && employee.role !== "미화원") {
      return Response.json({ error: "순찰 점검 권한이 없습니다." }, { status: 403 });
    }
    const session = await loadGuardSessionByEmployeeId(employee.id);
    if (!session.assignment || !session.worksite) {
      return Response.json({ error: "현재 배정된 근무지가 없습니다." }, { status: 403 });
    }
    return Response.json({
      log: await createInspectionLog({
        ...body,
        employeeId: employee.id,
        employeeName: employee.name,
        authorizedWorksiteId: session.assignment.worksite_id,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장점검을 저장하지 못했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}

import { createSpecialRemarkReport } from "@/lib/special-remark-reports";
import { guardAuthErrorStatus, requireGuardWorksite } from "@/lib/guard-auth-session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employee, worksite } = await requireGuardWorksite(request, body.employeeId);
    return Response.json({
      report: await createSpecialRemarkReport({ ...body, employeeId: employee.id, employeeName: employee.name, worksiteId: worksite.id, worksiteName: worksite.name }, { emailProvider: "formspree" }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "특이사항 보고를 저장하지 못했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}

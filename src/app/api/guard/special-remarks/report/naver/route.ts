import { createSpecialRemarkReport } from "@/lib/special-remark-reports";
import { getActiveEmployeeErrorStatus, requireActiveEmployee } from "@/lib/active-employee";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await requireActiveEmployee(body.employeeId);
    return Response.json({
      report: await createSpecialRemarkReport(body, { emailProvider: "naver" }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "특이사항 보고를 저장하지 못했습니다." },
      { status: getActiveEmployeeErrorStatus(error, 400) },
    );
  }
}

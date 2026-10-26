import { optionalDetailId } from "@/lib/detail-query";
import { getManagerUser } from "@/lib/manager-auth";
import { loadMonthlyAttendance } from "@/lib/monthly-attendance";

export async function GET(request: Request) {
  if (!(await getManagerUser()))
    return Response.json(
      { error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  try {
    const params = new URL(request.url).searchParams;
    const employeeId = optionalDetailId(params, "employeeId");
    return Response.json({
      rows: await (employeeId ? loadMonthlyAttendance(params.get("yearMonth") ?? "", employeeId) : loadMonthlyAttendance(params.get("yearMonth") ?? "")),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "월간근태를 불러오지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

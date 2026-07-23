import { loadAttendanceReport, updateAttendanceRecord } from "@/lib/manager-reports";
import { getManagerUser } from "@/lib/manager-auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeName = url.searchParams.get("employeeName") ?? "";
    const year = url.searchParams.get("year") ?? String(new Date().getFullYear());

    return Response.json({ rows: await loadAttendanceReport({ employeeName, year }) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근태내역을 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const manager = await getManagerUser();
    if (!manager) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const body = await request.json();
    return Response.json({
      attendance: await updateAttendanceRecord({
        recordId: body.recordId,
        clockInDateTime: body.clockInDateTime,
        clockOutDateTime: body.clockOutDateTime,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근태 기록 수정에 실패했습니다." },
      { status: 400 },
    );
  }
}

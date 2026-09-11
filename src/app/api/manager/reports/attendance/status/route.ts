import { todayDate } from "@/lib/phase1-data";
import { loadAttendanceStatus } from "@/lib/manager-reports";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? todayDate();
    return Response.json({ date, rows: await loadAttendanceStatus({ date }) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "출근현황을 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

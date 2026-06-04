import { loadAttendanceReport } from "@/lib/manager-reports";

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

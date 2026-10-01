import { getManagerUser } from "@/lib/manager-auth";
import { loadDailyEducationAttendance, loadMonthlyEducationAttendance } from "@/lib/safety-education-attendance";

export async function GET(request: Request) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const view = params.get("view");
    if (view === "daily") {
      return Response.json({ rows: await loadDailyEducationAttendance(params.get("date") ?? undefined) });
    }
    if (view === "monthly") {
      const yearMonth = params.get("yearMonth") ?? "";
      return Response.json(await loadMonthlyEducationAttendance(yearMonth));
    }
    return Response.json({ error: "조회 화면을 확인하세요." }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육이수 자료를 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

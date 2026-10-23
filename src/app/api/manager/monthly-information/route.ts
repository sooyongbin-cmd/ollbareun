import { getManagerUser } from "@/lib/manager-auth";
import { loadMonthlyInformation } from "@/lib/monthly-information";

export async function GET(request: Request) {
  if (!(await getManagerUser())) return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const yearMonth = new URL(request.url).searchParams.get("yearMonth") ?? "";
    return Response.json({ rows: await loadMonthlyInformation(yearMonth) });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : "월별전체현황을 불러오지 못했습니다." }, { status: 400 });
  }
}

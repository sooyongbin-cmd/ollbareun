import { loadManagerDashboardData } from "@/lib/manager-dashboard";

export async function GET() {
  try {
    return Response.json(await loadManagerDashboardData());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "대시보드 자료를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

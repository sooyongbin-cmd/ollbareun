import { listSpecialRemarkReports } from "@/lib/special-remark-reports";
import { getManagerUser } from "@/lib/manager-auth";

export async function GET(request: Request) {
  try {
    if (!await getManagerUser()) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const url = new URL(request.url);
    const year = url.searchParams.get("year") ?? "";
    return Response.json({ reports: await listSpecialRemarkReports({ year }) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "특이사항 목록을 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

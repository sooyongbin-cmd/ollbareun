import { loadBootstrap } from "@/lib/phase1-data";
import { getManagerUser } from "@/lib/manager-auth";

export async function GET() {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    return Response.json(await loadBootstrap());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "데이터를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

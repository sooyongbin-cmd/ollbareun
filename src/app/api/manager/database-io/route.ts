import { getManagerUser } from "@/lib/manager-auth";
import { loadDatabaseIoStats } from "@/lib/database-io";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const manager = await getManagerUser();
    if (!manager) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    return Response.json({ stats: await loadDatabaseIoStats() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "DB I/O 통계를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

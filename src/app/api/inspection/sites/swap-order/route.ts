import { swapInspectionSiteSortOrder } from "@/lib/inspection";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    await swapInspectionSiteSortOrder(body, getSupabaseAdmin());
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "점검순서를 변경하지 못했습니다." },
      { status: 400 },
    );
  }
}

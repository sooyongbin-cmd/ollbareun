import { createEmployee } from "@/lib/phase1-data";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    return Response.json({ employee: await createEmployee(body, getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "직원을 등록하지 못했습니다." },
      { status: 400 },
    );
  }
}

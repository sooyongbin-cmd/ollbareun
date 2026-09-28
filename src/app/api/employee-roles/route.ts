import { loadEmployeeRoles } from "@/lib/employee-roles";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    return Response.json({ roles: await loadEmployeeRoles(getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "직군 목록을 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

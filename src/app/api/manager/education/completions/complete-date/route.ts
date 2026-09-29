import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  if (!(await getManagerUser())) {
    return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    const educationDate = typeof body.educationDate === "string" ? body.educationDate.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId)) {
      return Response.json({ error: "직원 정보를 확인하세요." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(educationDate)
      || !Number.isFinite(Date.parse(educationDate))
      || new Date(educationDate).toISOString().slice(0, 10) !== educationDate) {
      return Response.json({ error: "교육 날짜를 확인하세요." }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("education_completions")
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq("employee_id", employeeId)
      .eq("education_date", educationDate)
      .eq("is_completed", false)
      .select("employee_id,resource_id");

    if (error) throw new Error("안전교육 이수 정보를 저장하지 못했습니다.");
    return Response.json({ success: true, updatedCount: data?.length ?? 0 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "교육이수 처리에 실패했습니다.",
    }, { status: 400 });
  }
}

import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: RouteContext) {
  if (!(await getManagerUser())) {
    return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: "안전교육 자료를 확인하세요." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("education_completions")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return Response.json({ error: "안전교육 자료를 삭제하지 못했습니다." }, { status: 500 });
  if (!data) return Response.json({ error: "안전교육 자료를 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ success: true });
}

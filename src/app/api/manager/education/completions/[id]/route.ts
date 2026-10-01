import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { parseEducationCompletedAt } from "@/lib/education-periods";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await getManagerUser())) {
    return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: "안전교육 자료를 확인하세요." }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  if (typeof body?.isCompleted !== "boolean") {
    return Response.json({ error: "이수여부를 확인하세요." }, { status: 400 });
  }
  let completedAt: string | null = null;
  if (body.isCompleted) {
    try {
      completedAt = parseEducationCompletedAt(body.completedAt);
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "이수(완료)일시를 확인하세요." }, { status: 400 });
    }
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from("education_completions")
    .select("id,completed_at")
    .eq("id", id)
    .maybeSingle();
  if (readError) return Response.json({ error: "안전교육 자료를 불러오지 못했습니다." }, { status: 500 });
  if (!existing) return Response.json({ error: "안전교육 자료를 찾을 수 없습니다." }, { status: 404 });

  let update = supabase
    .from("education_completions")
    .update({ completed_at: completedAt })
    .eq("id", id);
  update = existing.completed_at === null
    ? update.is("completed_at", null)
    : update.eq("completed_at", existing.completed_at);
  const { data, error } = await update.select("id,completed_at").maybeSingle();
  if (error) return Response.json({ error: "안전교육 자료를 저장하지 못했습니다." }, { status: 500 });
  if (!data) return Response.json({ error: "안전교육 자료가 변경되었습니다. 새로고침 후 다시 저장하세요." }, { status: 409 });
  return Response.json({ completion: { ...data, is_completed: data.completed_at !== null } });
}

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

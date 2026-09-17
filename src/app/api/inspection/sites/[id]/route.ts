import { deleteInspectionSite, getInspectionSiteById, updateInspectionSite } from "@/lib/inspection";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const { id } = await context.params;
    return Response.json({ site: await getInspectionSiteById(id, getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장 정보를 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const { id } = await context.params;
    const body = await request.json();
    return Response.json({ site: await updateInspectionSite({ id, ...body }, getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장 정보를 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const { id } = await context.params;
    await deleteInspectionSite(id, getSupabaseAdmin());
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장을 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}

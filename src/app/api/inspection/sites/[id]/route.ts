import { deleteInspectionSite, getInspectionSiteById, updateInspectionSite } from "@/lib/inspection";
import { getManagerUser } from "@/lib/manager-auth";
import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";
import { loadGuardSessionByEmployeeId } from "@/lib/phase1-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!(await getManagerUser())) {
      const employee = await requireGuardEmployee(request);
      const session = await loadGuardSessionByEmployeeId(employee.id);
      if (!session.assignment || !session.worksite) {
        return Response.json({ error: "현재 배정된 근무지가 없습니다." }, { status: 403 });
      }
      const site = await getInspectionSiteById(id, getSupabaseAdmin());
      if (site.worksite_id !== session.worksite.id) {
        return Response.json({ error: "배정된 근무지의 점검지만 조회할 수 있습니다." }, { status: 403 });
      }
      if (employee.role !== "경비원" && employee.role !== "미화원") {
        return Response.json({ error: "점검 조회 권한이 없습니다." }, { status: 403 });
      }
      return Response.json({ site });
    }
    return Response.json({ site: await getInspectionSiteById(id, getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장 정보를 불러오지 못했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
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

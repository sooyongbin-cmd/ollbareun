import { createInspectionSite, listInspectionSites } from "@/lib/inspection";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";
import { loadGuardSessionByEmployeeId } from "@/lib/phase1-data";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get("name") ?? "";
    const requestedWorksiteId = url.searchParams.get("worksiteId") ?? "";
    const worksiteName = url.searchParams.get("worksiteName") ?? "";
    if (!(await getManagerUser())) {
      const employee = await requireGuardEmployee(request);
      const session = await loadGuardSessionByEmployeeId(employee.id);
      const worksiteId = session.worksite?.id;
      if (!session.assignment || !worksiteId || (requestedWorksiteId && requestedWorksiteId !== worksiteId)) {
        return Response.json({ error: "배정된 근무지의 점검 목록만 조회할 수 있습니다." }, { status: 403 });
      }
      if (employee.role !== "경비원" && employee.role !== "미화원") {
        return Response.json({ error: "점검 목록 조회 권한이 없습니다." }, { status: 403 });
      }
      return Response.json({ sites: await listInspectionSites({ name, worksiteId }, getSupabaseAdmin()) });
    }
    const worksiteId = requestedWorksiteId;
    return Response.json({ sites: await listInspectionSites({ name, worksiteId, worksiteName }, getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "점검지 목록을 불러오지 못했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const body = await request.json();
    return Response.json({ site: await createInspectionSite(body, getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "점검지를 등록하지 못했습니다." },
      { status: 400 },
    );
  }
}

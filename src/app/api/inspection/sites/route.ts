import { createInspectionSite, listInspectionSites } from "@/lib/inspection";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const url = new URL(request.url);
    const name = url.searchParams.get("name") ?? "";
    const worksiteId = url.searchParams.get("worksiteId") ?? "";
    const worksiteName = url.searchParams.get("worksiteName") ?? "";
    return Response.json({ sites: await listInspectionSites({ name, worksiteId, worksiteName }, getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "점검지 목록을 불러오지 못했습니다." },
      { status: 400 },
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

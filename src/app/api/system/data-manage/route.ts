import { getManagerUser } from "@/lib/manager-auth";
import { deleteYearData, getYearDataSummary } from "@/lib/year-data-management";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await getManagerUser()) return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    return Response.json(await getYearDataSummary(new URL(request.url).searchParams.get("year")), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "자료를 조회하지 못했습니다." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!await getManagerUser()) return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  // Reject cross-origin browser requests to this destructive cookie-authenticated API.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "요청 출처가 올바르지 않습니다." }, { status: 403 });
  try {
    const body = await request.json();
    if (body.confirmed !== true) return Response.json({ error: "자료 삭제를 최종 확인해 주세요." }, { status: 400 });
    return Response.json({ deleted: await deleteYearData(body.year) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "자료를 삭제하지 못했습니다." }, { status: 400 });
  }
}

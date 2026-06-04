import { createInspectionSite, listInspectionSites } from "@/lib/inspection";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get("name") ?? "";
    return Response.json({ sites: await listInspectionSites({ name }) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장 목록을 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json({ site: await createInspectionSite(body) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장을 등록하지 못했습니다." },
      { status: 400 },
    );
  }
}

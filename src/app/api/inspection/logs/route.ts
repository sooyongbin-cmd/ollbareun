import { createInspectionLog, listInspectionLogs } from "@/lib/inspection";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const worksiteId = url.searchParams.get("worksiteId") ?? "";
    return Response.json({ logs: await listInspectionLogs({ worksiteId }) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장점검현황을 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json({ log: await createInspectionLog(body) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장점검을 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}

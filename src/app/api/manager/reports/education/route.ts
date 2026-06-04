import { loadEducationReport } from "@/lib/manager-reports";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const year = url.searchParams.get("year") ?? String(new Date().getFullYear());

    return Response.json({ rows: await loadEducationReport({ year }) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육이수자료를 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

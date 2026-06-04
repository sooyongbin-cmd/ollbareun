import { getInspectionSiteById } from "@/lib/inspection";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return Response.json({ site: await getInspectionSiteById(id) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장 정보를 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

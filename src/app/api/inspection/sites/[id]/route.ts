import { deleteInspectionSite, getInspectionSiteById, updateInspectionSite } from "@/lib/inspection";

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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    return Response.json({ site: await updateInspectionSite({ id, ...body }) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장 정보를 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await deleteInspectionSite(id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "현장을 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}

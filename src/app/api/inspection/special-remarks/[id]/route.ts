import { deleteSpecialRemarkReport, getSpecialRemarkReport } from "@/lib/special-remark-reports";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    return Response.json({ report: await getSpecialRemarkReport(id) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "특이사항을 불러오지 못했습니다." },
      { status: 404 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    await deleteSpecialRemarkReport(id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "특이사항을 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}

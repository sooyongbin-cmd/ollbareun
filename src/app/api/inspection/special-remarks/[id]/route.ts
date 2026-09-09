import { completeSpecialRemarkReport, deleteSpecialRemarkReport, getSpecialRemarkReport } from "@/lib/special-remark-reports";
import { getManagerUser } from "@/lib/manager-auth";

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

export async function PATCH(_: Request, { params }: RouteContext) {
  try {
    if (!await getManagerUser()) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const { id } = await params;
    return Response.json({ report: await completeSpecialRemarkReport(id) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "처리상태를 변경하지 못했습니다." },
      { status: 400 },
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

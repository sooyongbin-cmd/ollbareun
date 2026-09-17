import { deleteWorksite, getWorksiteById, updateWorksite } from "@/lib/phase1-data";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    return Response.json({ worksite: await getWorksiteById(id, getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근무지를 불러오지 못했습니다." },
      { status: 404 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    return Response.json({
      worksite: await updateWorksite({
        id,
        name: body.name,
        address: body.address,
        gpsInfo: body.gpsInfo,
        radiusMeters: body.radiusMeters,
      }, supabase),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근무지를 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    await deleteWorksite(id, getSupabaseAdmin());
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근무지를 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}

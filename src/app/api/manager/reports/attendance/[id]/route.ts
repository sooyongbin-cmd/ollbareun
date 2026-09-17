import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { deleteAttendanceRecord, loadAttendanceRecord, updateAttendanceRecord } from "@/lib/manager-reports";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const manager = await getManagerUser();
    if (!manager) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const { id } = await params;
    return Response.json({ attendance: await loadAttendanceRecord(id, getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근태 기록을 불러오지 못했습니다." },
      { status: 404 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const manager = await getManagerUser();
    if (!manager) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    return Response.json({
      attendance: await updateAttendanceRecord({
        recordId: id,
        clockInDateTime: body.clockInDateTime,
        clockOutDateTime: body.clockOutDateTime,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근태 기록 수정에 실패했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const manager = await getManagerUser();
    if (!manager) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const { id } = await params;
    await deleteAttendanceRecord(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근태 기록을 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}

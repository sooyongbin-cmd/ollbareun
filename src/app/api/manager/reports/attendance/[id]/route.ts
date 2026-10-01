import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { attendanceEducationStatus, markAttendanceEducationCompletions } from "@/lib/education-completions";
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
    const attendance = await loadAttendanceRecord(id, getSupabaseAdmin());
    const education = await attendanceEducationStatus(attendance.employeeId, attendance.workDate);
    return Response.json({ attendance, education });
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
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "저장할 내용을 확인하세요." }, { status: 400 });
    }
    const educationResourceIds = body.educationResourceIds ?? [];
    if (!Array.isArray(educationResourceIds)
      || educationResourceIds.some((resourceId: unknown) => typeof resourceId !== "string")) {
      return Response.json({ error: "교육이수 항목을 확인하세요." }, { status: 400 });
    }

    const hasAttendanceChanges = Boolean(body.clockInDateTime || body.clockOutDateTime);
    const attendanceContext = educationResourceIds.length
      ? await loadAttendanceRecord(id, getSupabaseAdmin())
      : null;
    let attendance;
    if (hasAttendanceChanges || educationResourceIds.length === 0) {
      attendance = await updateAttendanceRecord({
        recordId: id,
        clockInDateTime: body.clockInDateTime,
        clockOutDateTime: body.clockOutDateTime,
      });
    }
    const education = educationResourceIds.length
      ? await markAttendanceEducationCompletions({
        employeeId: attendanceContext!.employeeId,
        workDate: attendanceContext!.workDate,
        resourceIds: educationResourceIds,
      })
      : [];
    return Response.json({ ...(attendance ? { attendance } : {}), education });
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

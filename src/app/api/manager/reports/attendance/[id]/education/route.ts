import { getManagerUser } from "@/lib/manager-auth";
import { loadAttendanceRecord } from "@/lib/manager-reports";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { markAttendanceEducationCompletions } from "@/lib/education-completions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await getManagerUser()) return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
    const { id } = await params;
    const { resourceId } = await request.json();
    if (typeof resourceId !== "string" || !resourceId.trim()) throw new Error("교육 자료를 선택하세요.");
    const attendance = await loadAttendanceRecord(id, getSupabaseAdmin());
    if (!attendance.clockInDateTime || attendance.clockInDateTime === "-") throw new Error("출근처리후 교육이수 처리해주세요.");
    await markAttendanceEducationCompletions({ employeeId: attendance.employeeId, workDate: attendance.workDate, resourceIds: [resourceId] });
    return Response.json({ resourceId, isCompleted: true });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : "교육이수 처리에 실패했습니다." }, { status: 400 });
  }
}

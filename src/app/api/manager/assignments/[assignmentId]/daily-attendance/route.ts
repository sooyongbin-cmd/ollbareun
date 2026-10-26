import { optionalDetailId } from "@/lib/detail-query";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    if (!await getManagerUser()) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const { assignmentId } = await params;
    const attendanceId = optionalDetailId(new URL(request.url).searchParams, "attendanceId");
    const supabase = getSupabaseAdmin();
    const { data: assignment, error: assignmentError } = await supabase
      .from("work_assignments")
      .select("employee_id,worksite_id,start_date,end_date")
      .eq("id", assignmentId)
      .single();
    if (assignmentError) throw new Error(assignmentError.message);

    let query = supabase
      .from("work_record")
      .select("id,work_date,intime,outtime")
      .eq("employee_id", assignment.employee_id)
      .eq("worksite_id", assignment.worksite_id)
      .gte("work_date", assignment.start_date)
      .lte("work_date", assignment.end_date)
      .order("work_date");
    if (attendanceId) query = query.eq("id", attendanceId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return Response.json({ dailyAttendance: data ?? [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "출퇴근 예정시각을 불러오지 못했습니다." }, { status: 400 });
  }
}

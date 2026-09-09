import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    if (!await getManagerUser()) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const { assignmentId } = await params;
    const { data, error } = await getSupabaseAdmin()
      .from("work_assignment_daily_attendance")
      .select("work_date,intime,outtime")
      .eq("work_assignment_id", assignmentId)
      .order("work_date");
    if (error) throw new Error(error.message);
    return Response.json({ dailyAttendance: data ?? [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "출퇴근 예정시각을 불러오지 못했습니다." }, { status: 400 });
  }
}

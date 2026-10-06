import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    if (!await getManagerUser()) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const { assignmentId } = await params;
    const supabase = getSupabaseAdmin();
    const { data: assignment, error: assignmentError } = await supabase
      .from("work_assignments")
      .select("employee_id,start_date,end_date")
      .eq("id", assignmentId)
      .single();

    if (assignmentError) throw new Error(assignmentError.message);

    const { data, error } = await supabase
      .from("work_record")
      .select("id,work_date,intime_status,work_intime,work_outtime")
      .eq("employee_id", assignment.employee_id)
      .gte("work_date", assignment.start_date)
      .lte("work_date", assignment.end_date)
      .or("work_intime.not.is.null,work_outtime.not.is.null")
      .order("work_date", { ascending: false });

    if (error) throw new Error(error.message);
    return Response.json({ attendances: data ?? [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "출근 목록을 불러오지 못했습니다." }, { status: 400 });
  }
}

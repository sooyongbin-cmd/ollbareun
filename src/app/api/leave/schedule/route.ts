import { listLeaveScheduledWork } from "@/lib/leave";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const url = new URL(request.url);
    const workRecords = await listLeaveScheduledWork(
      {
        employeeId: url.searchParams.get("employeeId"),
        startDate: url.searchParams.get("startDate"),
        endDate: url.searchParams.get("endDate"),
      },
      getSupabaseAdmin(),
    );

    return Response.json({ workRecords });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근무예정을 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

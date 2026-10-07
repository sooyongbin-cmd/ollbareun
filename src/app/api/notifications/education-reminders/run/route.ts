import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { educationToday } from "@/lib/education-periods";

export async function POST(request: Request) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const body = await request.json();
    if (body.workDate !== educationToday()) {
      return Response.json({ error: "근무일을 오늘로 조회한 후 교육알림 처리해주세요." }, { status: 400 });
    }
    if (!Array.isArray(body.employeeIds) || body.employeeIds.some((id: unknown) =>
      typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
      return Response.json({ error: "조회 목록의 직원 정보를 확인하세요." }, { status: 400 });
    }
    const { data, error } = await getSupabaseAdmin().rpc("register_daily_education_reminders", {
      p_work_date: body.workDate,
      p_employee_ids: [...new Set(body.employeeIds)],
    }).single<{ registered_count: number; delay_minutes: number }>();
    if (error) throw new Error(error.message);
    return Response.json({ registeredCount: data.registered_count, delayMinutes: data.delay_minutes });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육알림 등록에 실패했습니다." },
      { status: 400 },
    );
  }
}

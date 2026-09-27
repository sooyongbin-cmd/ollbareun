import { listAssignmentDaysOff } from "@/lib/assignment-days-off";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ assignmentId: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const manager = await getManagerUser();
    if (!manager) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const { assignmentId } = await params;
    const [daysOff, holidaysResult] = await Promise.all([
      listAssignmentDaysOff(assignmentId),
      getSupabaseAdmin().from("public_holidays").select("holiday_date").eq("selected", "Y"),
    ]);
    if (holidaysResult.error) throw new Error(holidaysResult.error.message || "공휴일을 불러오지 못했습니다.");
    return Response.json({ daysOff, holidays: (holidaysResult.data ?? []).map((holiday) => holiday.holiday_date) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "휴무일을 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

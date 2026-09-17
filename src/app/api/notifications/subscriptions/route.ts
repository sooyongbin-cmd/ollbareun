import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("employee_id");

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const employeeIds = Array.from(new Set((data ?? []).map((row) => row.employee_id)));
    return Response.json({ employeeIds });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "구독 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

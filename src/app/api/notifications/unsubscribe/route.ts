import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { employeeId } = await request.json();

    if (typeof employeeId !== "string" || employeeId.trim() === "") {
      return Response.json({ error: "employeeId가 필요합니다." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("employee_id", employeeId)
      .select("id");

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, deletedCount: data?.length ?? 0 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "구독 해제 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

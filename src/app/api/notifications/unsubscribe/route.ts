import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { employeeId, endpoint } = await request.json();

    if (typeof employeeId !== "string" || employeeId.trim() === "") {
      return Response.json({ error: "employeeId가 필요합니다." }, { status: 400 });
    }

    const supabase = getSupabase();
    let query = supabase.from("push_subscriptions").delete().eq("employee_id", employeeId);

    if (typeof endpoint === "string" && endpoint.trim() !== "") {
      query = query.eq("endpoint", endpoint);
    }

    const { error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "구독 해제 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

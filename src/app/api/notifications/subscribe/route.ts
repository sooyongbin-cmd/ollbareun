import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { employeeId, subscription } = await request.json();

    if (!employeeId) {
      return Response.json({ error: "employeeId가 필요합니다." }, { status: 400 });
    }

    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys ||
      !subscription.keys.p256dh ||
      !subscription.keys.auth
    ) {
      return Response.json({ error: "유효한 구독 정보(subscription)가 필요합니다." }, { status: 400 });
    }

    const supabase = getSupabase();

    // Upsert subscription to handle multiple devices/sessions
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          employee_id: employeeId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "employee_id,endpoint" },
      )
      .select()
      .single();

    if (error) {
      console.error("Database error saving push subscription:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "구독 설정 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

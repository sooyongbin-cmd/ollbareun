import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";

export async function POST(request: Request) {
  try {
    const { employeeId, subscription } = await request.json();

    if (!employeeId) {
      return Response.json({ error: "employeeId가 필요합니다." }, { status: 400 });
    }

    const employee = await requireGuardEmployee(request, employeeId);

    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys ||
      !subscription.keys.p256dh ||
      !subscription.keys.auth
    ) {
      return Response.json({ error: "유효한 구독 정보(subscription)가 필요합니다." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Remove any existing subscription associated with this endpoint (device)
    // so that only the most recently logged-in employee on this device receives push notifications.
    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", subscription.endpoint);

    if (deleteError) {
      console.error("Database error deleting duplicate endpoint push subscription:", deleteError);
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    // Keep one current push subscription per employee.
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          employee_id: employee.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "employee_id" },
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
      { status: guardAuthErrorStatus(error) },
    );
  }
}

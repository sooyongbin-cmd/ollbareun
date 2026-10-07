import { getSupabaseAdmin } from "./supabase-admin";
import type { AdminPushSubscription } from "./admin-subscription-rows";

export async function listAdminPushSubscriptions(): Promise<AdminPushSubscription[]> {
  const supabase = getSupabaseAdmin();
  const rows: AdminPushSubscription[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("manager_push_subscriptions")
      .select("id,user_id,updated_at").order("id").range(offset, offset + 999);
    if (error) throw new Error(error.message || "관리자 구독을 불러오지 못했습니다.");
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

export async function deleteAdminPushSubscription(adminId: string, subscriptionId: string) {
  const supabase = getSupabaseAdmin();
  const { data: admin, error: adminError } = await supabase.from("admin_users")
    .select("user_id").eq("id", adminId).single();
  if (adminError) throw new Error(adminError.message);
  if (!admin?.user_id) throw new Error("해당 관리자의 구독을 찾을 수 없습니다.");
  const { data, error } = await supabase.from("manager_push_subscriptions").delete()
    .eq("id", subscriptionId).eq("user_id", admin.user_id).select("id");
  if (error) throw new Error(error.message || "구독 삭제에 실패했습니다.");
  if (!data?.length) throw new Error("해당 관리자의 구독을 찾을 수 없습니다.");
}
